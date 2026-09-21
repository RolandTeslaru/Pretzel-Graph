import { Injectable } from "@nestjs/common";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Dependency, Workbench, Workflow } from "@pretzel-graph/shared/domain";
import type { RuntimeNode } from "@pretzel-graph/node-sdk";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import { System } from "@pretzel-graph/shared/system";

const SUBWORKFLOW_EXECUTE_BLUEPRINT_ID = "Core.SubWorkflow.Execute" as Blueprint.Id;

export type NodeConstructor = {
    new(
        nodeId: Workflow.Node.Id,
        context: RuntimeNode.Context,
    ): RuntimeNode<any, any>;
};

const nodeSelectors = Workbench.Document.selectors.node;

// What the catalogue knows about one blueprint id; both halves load on demand.
type CatalogueEntry = {
    blueprint: Blueprint | null;
    node:      NodeConstructor | null;
};

// Owns the worker process's registry of blueprints and runtime-node constructors.
@Injectable()
export class CatalogueService {

    private nodesRoot = process.env.NODES_ROOT ?? path.resolve(__dirname, "../../../nodes/src");

    private readonly log = System.log.withContext("Catalogue");

    private readonly registry = new Map<Blueprint.Id, CatalogueEntry>();

    // Non-zero while a preload runs, so its imports are not reported as lazy ones.
    private preloadDepth = 0;




    public setNodesRoot(rootPath: string): void {
        this.nodesRoot = rootPath;
    }




    private ensureEntry(id: Blueprint.Id): CatalogueEntry {
        let entry = this.registry.get(id);

        if (!entry) {
            entry = { blueprint: null, node: null };
            this.registry.set(id, entry);
        }

        return entry;
    }




    // Loads both halves of one entry: the blueprint and its runtime-node constructor.
    public async preload(blueprintId: Blueprint.Id): Promise<void> {
        this.preloadDepth++;

        const [blueprint, node] = await Promise.all([
            this.getBlueprint(blueprintId),
            this.getNodeConstructor(blueprintId),
        ]).finally(() => { this.preloadDepth--; });

        if (!blueprint)
            throw new Error(`Failed to preload blueprint: ${blueprintId}`);

        if (!node)
            throw new Error(`Failed to preload node class: ${blueprintId}`);
    }




    // Walks the namespace's directory and preloads everything under it, e.g. "Core" or "Integrations.Discord".
    public async preloadByNamespace(namespace: string): Promise<void> {
        const directory = path.join(this.nodesRoot, namespace.replace(/\./g, "/"));
        const ids = await this.discoverBlueprintIds(directory, namespace);
        const startedAt = performance.now();

        const results = await Promise.allSettled(ids.map(id => this.preload(id)));
        const failures = results.flatMap(result =>
            result.status === "rejected" ? [String(result.reason?.message ?? result.reason)] : [],
        );

        if (failures.length > 0)
            throw new Error(`Failed to preload ${namespace}:\n${failures.join("\n")}`);

        this.log.info("preloaded namespace", { namespace, nodes: ids.length, ms: performance.now() - startedAt });
    }




    public async getNodeConstructor(blueprintId: Blueprint.Id): Promise<NodeConstructor | null> {
        const entry = this.ensureEntry(blueprintId);
        if (entry.node)
            return entry.node;

        const fullPath = Blueprint.getPath(this.nodesRoot, blueprintId, "node");
        const startedAt = performance.now();

        try {
            const module = await import(fullPath);
            const NodeClass = (module.Node ?? null) as NodeConstructor | null;

            if (!NodeClass)
                throw new Error(`Module loaded from ${fullPath} does not export a 'Node' class.`);

            entry.node = NodeClass;

            if (this.preloadDepth === 0)
                this.log.info("lazy loaded node class", { blueprintId, ms: performance.now() - startedAt });

            return NodeClass;
        }
        catch (error) {
            this.log.error("failed to load node class", { blueprintId, error });
            return null;
        }
    }




    // Loads the blueprint if the registry lacks it. Pass field values to derive one, or a
    // reconciled id to rebuild that exact derivative — never both.
    public async getBlueprint(
        blueprintId: Blueprint.Id | Blueprint.ReconciledId,
        fieldValues?: Record<Field.Id, Field.Value>,
    ): Promise<Blueprint | null> {
        if (Blueprint.isReconciledId(blueprintId)) {
            if (fieldValues)
                throw new Error(`getBlueprint: "${blueprintId}" is a reconciled id, so it cannot take field values.`);

            return this.deriveByReconciledId(blueprintId);
        }

        const entry = this.ensureEntry(blueprintId);

        if (!entry.blueprint) {
            const fullPath = Blueprint.getPath(this.nodesRoot, blueprintId, "blueprint");
            const startedAt = performance.now();

            try {
                const module = await import(fullPath);
                entry.blueprint = (module.Blueprint ?? null) as Blueprint | null;

                if (this.preloadDepth === 0)
                    this.log.info("lazy loaded blueprint", { blueprintId, ms: performance.now() - startedAt });
            }
            catch (error) {
                this.log.error("failed to load blueprint", { blueprintId, error });
                return null;
            }
        }

        const base = entry.blueprint;

        if (!base || !fieldValues || !Blueprint.isDerivable(base))
            return base;

        const derivedBlueprintId = Blueprint.deriveId(base, fieldValues);
        const cached = this.registry.get(derivedBlueprintId)?.blueprint;

        if (cached)
            return cached;

        const { blueprint } = Blueprint.derive(base, fieldValues);
        this.ensureEntry(derivedBlueprintId).blueprint = blueprint;

        return blueprint;
    }




    // Rebuilds a derivative from its own id, by loading the base and replaying the derivative path.
    private async deriveByReconciledId(reconciledId: Blueprint.ReconciledId): Promise<Blueprint | null> {
        const cached = this.registry.get(reconciledId)?.blueprint;

        if (cached)
            return cached;

        const baseId = Blueprint.extractBlueprintId(reconciledId);
        const base = await this.getBlueprint(baseId);

        if (!base)
            return null;

        const derivativePath = reconciledId.slice(baseId.length + 1);
        const blueprint = Blueprint.deriveByPath(base, derivativePath);

        this.ensureEntry(reconciledId).blueprint = blueprint;

        return blueprint;
    }




    public async preloadWorkflowBlueprints(wfData: Workflow.Data): Promise<void> {
        for (const wfNode of Object.values(wfData.nodes)) {
            if (nodeSelectors.dependency.getShapeRef({ data: wfData }, wfNode.id)) {
                const dummyBlueprint = await this.getBlueprint(SUBWORKFLOW_EXECUTE_BLUEPRINT_ID);

                if (dummyBlueprint)
                    this.ensureEntry(wfNode.blueprintId).blueprint = dummyBlueprint;

                continue;
            }

            await this.getBlueprint(wfNode.blueprintId, wfData.staticValues[wfNode.id] ?? {});
        }

        for (const dependency of Object.values(wfData.dependencies ?? {})) {
            switch (dependency.kind) {
                case "draftWorkflow":
                case "publishedWorkflow":
                case "listing":
                    await this.preloadWorkflowBlueprints(dependency.workflow_data);
                    break;

                case "skill":
                    break;

                default:
                    dependency satisfies never;
            }
        }
    }




    // Sync read of what is already loaded.
    public getCachedBlueprint(id: Blueprint.Id): Blueprint | undefined {
        return this.registry.get(id)?.blueprint ?? undefined;
    }




    // The blueprint a node resolved to: its base, or the derivative its field values selected.
    public getNodeBlueprint(wfNode: Workflow.Node.Raw): Blueprint {
        const blueprint = this.getCachedBlueprint(wfNode.reconciledBlueprintId ?? wfNode.blueprintId);

        if (!blueprint)
            throw new Error(`Blueprint not resolved for node ${wfNode.id} (${wfNode.blueprintId}) — catalogue cache not warmed`);

        return blueprint;
    }




    private getNodeShapeDependency(wfNode: Workflow.Node.Raw, wfData: Workflow.Data) {
        const shapeDepRef = nodeSelectors.dependency.getShapeRef({ data: wfData }, wfNode.id);

        if (!shapeDepRef)
            return null;

        const dependency = wfData.dependencies?.[Dependency.createId(shapeDepRef)];

        if (!dependency)
            throw new Error(`Node ${wfNode.id} has a dependency (${shapeDepRef.id}) but it is not in the store`);

        return dependency;
    }




    public async resolveWorkflowNode(
        wfNode: Workflow.Node.Raw,
        staticValues: Workflow.Data["staticValues"][Workflow.Node.Id],
        wfData: Workflow.Data,
    ): Promise<{ RuntimeNode: NodeConstructor; blueprint: Blueprint }> {
        const dependency = this.getNodeShapeDependency(wfNode, wfData);

        if (!dependency) {
            const RuntimeNode = await this.getNodeConstructor(wfNode.blueprintId);
            const blueprint = await this.getBlueprint(wfNode.blueprintId, staticValues);

            if (!RuntimeNode)
                throw new Error(`Could not get the RuntimeNode constructor for ${wfNode.blueprintId}`);
            if (!blueprint)
                throw new Error(`Could not get the resolved blueprint for ${wfNode.blueprintId} for node ${wfNode.id}`);

            return { RuntimeNode, blueprint };
        }

        const RuntimeNode = await this.getNodeConstructor(SUBWORKFLOW_EXECUTE_BLUEPRINT_ID);
        const dummyBlueprint = await this.getBlueprint(SUBWORKFLOW_EXECUTE_BLUEPRINT_ID);

        if (!RuntimeNode || !dummyBlueprint)
            throw new Error(`Could not resolve node ${wfNode.id} with dependency ${nodeSelectors.dependency.getShapeRef({ data: wfData }, wfNode.id)?.id}. Core.SubWorkflow.Execute node not found in the catalogue`);

        return { RuntimeNode, blueprint: dummyBlueprint };
    }




    private async discoverBlueprintIds(directory: string, namespace: string): Promise<Blueprint.Id[]> {
        const entries = await fs.readdir(directory, { withFileTypes: true });
        const ids: Blueprint.Id[] = [];

        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;

            const childDirectory = path.join(directory, entry.name);
            const childNamespace = `${namespace}.${entry.name}`;
            const children = await fs.readdir(childDirectory, { withFileTypes: true });

            if (children.some(child => child.isFile() && (child.name === "blueprint.ts" || child.name === "blueprint.js")))
                ids.push(childNamespace as Blueprint.Id);

            ids.push(...await this.discoverBlueprintIds(childDirectory, childNamespace));
        }

        return ids;
    }
}
