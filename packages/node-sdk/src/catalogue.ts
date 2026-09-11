import { container, singleton } from "tsyringe";
import { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import type { RuntimeNode } from "./node";
import type { Loader } from "./builders/loaders";

const SUBWORKFLOW_EXECUTE_BLUEPRINT_ID = "Core.SubWorkflow.Execute" as Blueprint.Id;

export type NodeConstructor = {
    new(
        nodeId: Workflow.Node.Id,
        context: RuntimeNode.ExecutionContext
    ): RuntimeNode<any, any>;
}

@singleton()
class CatalogueServiceImpl {
    private static registry = new Map<Blueprint.Id, NodeConstructor>();
    private __registry = CatalogueServiceImpl.registry;

    public static register(
        blueprintId: Blueprint.Id, 
        constructor: NodeConstructor
    ) {
        if (this.registry.has(blueprintId))
            console.warn(`[NodeRegistry] Overwriting node type: ${blueprintId}`);

        this.registry.set(blueprintId, constructor);
    }

    private nodesRoot: string = "";

    // Base + resolved derivative blueprints share one cache. ReconciledId remains the persisted
    // workflow brand, but every non-base cache key is now a derivative path.
    private blueprintCache = new Map<Blueprint.Id, Blueprint>();

    public setNodesRoot(rootPath: string) {
        this.nodesRoot = rootPath;
    }

    public async getNodeConstructor(blueprintId: Blueprint.Id) {
        if (this.__registry.has(blueprintId))
            return this.__registry.get(blueprintId);

        if (!this.nodesRoot)
            throw new Error(`[CatalogueService] nodesRoot not set. Call setNodesRoot() before loading nodes.`);

        const relativePath = blueprintId.replace(/\./g, "/");
        const fullPath = `${this.nodesRoot}/${relativePath}/node`;

        try {
            const module = await import(fullPath);

            // An explicit @RegisterNode wins; otherwise fall back to the exported Node class,
            // mirroring how loadBaseBlueprint reads the sibling module's Blueprint export.
            if (this.__registry.has(blueprintId))
                return this.__registry.get(blueprintId);

            const NodeClass = (module.Node ?? null) as NodeConstructor | null;

            if (!NodeClass)
                throw new Error(`Module loaded from ${relativePath} does not export a 'Node' class.`);

            CatalogueServiceImpl.register(blueprintId, NodeClass);

            return NodeClass;

        } catch (error) {
            console.error(`[CatalogueService] Failed to load node '${blueprintId}':`, error);
            return null;
        }
    }

    public async loadBaseBlueprint(blueprintId: Blueprint.Id): Promise<Blueprint | null> {
        const cached = this.blueprintCache.get(blueprintId);
        if (cached) return cached;

        if (!this.nodesRoot)
            throw new Error(`[CatalogueService] nodesRoot not set. Call setNodesRoot() before loading blueprints.`);

        const relativePath = blueprintId.replace(/\./g, "/");
        const fullPath = `${this.nodesRoot}/${relativePath}/blueprint`;

        try {
            const module = await import(fullPath);
            const blueprint = (module.Blueprint ?? null) as Blueprint | null;
            if (blueprint) 
                this.blueprintCache.set(blueprintId, blueprint);
            return blueprint;

        } catch (error) {
            console.error(`[CatalogueService] Failed to load blueprint '${blueprintId}':`, error);
            return null;
        }
    }

    // Resolve a blueprint's derivative for the supplied field values. Static blueprints return
    // their base unchanged; there is no dynamic module or mutation fallback.
    public async resolveBlueprint(
        baseBlueprintId: Blueprint.Id,
        fieldValues: Record<Field.Id, Field.Value>,
    ): Promise<Blueprint | null> {
        // Get the Base first
        const base = await this.loadBaseBlueprint(baseBlueprintId);
        if (!base) 
            return null;
        
        if (!Blueprint.isDerivable(base))
            return base;

        // Derive and check cache
        const derivedBlueprintId = Blueprint.deriveId(base, fieldValues);
        const cached = this.blueprintCache.get(derivedBlueprintId);
        if (cached) 
            return cached;

        const { blueprint } = Blueprint.derive(base, fieldValues);
        this.blueprintCache.set(derivedBlueprintId, blueprint);
        return blueprint;
    }

    // Pre-warms the cache for a workflow and every embedded dependency, so sync reads never miss.
    // Dependency nodes cache the SubWorkflow Execute blueprint under their cosmetic id.
    public async warmBlueprintCache(wfData: Workflow.Data): Promise<void> {
        for (const wfNode of Object.values(wfData.nodes)) {
            if (wfNode.dependencyRef) {
                const dummyBlueprint = await this.loadBaseBlueprint(SUBWORKFLOW_EXECUTE_BLUEPRINT_ID);

                if (dummyBlueprint)
                    this.blueprintCache.set(wfNode.blueprintId, dummyBlueprint);

                continue;
            }

            await this.resolveBlueprint(wfNode.blueprintId, wfData.staticValues[wfNode.id] ?? {});
        }

        for (const dependency of Object.values(wfData.dependencies?.published ?? {}))
            await this.warmBlueprintCache(dependency.workflow_data);

        for (const dependency of Object.values(wfData.dependencies?.draft ?? {}))
            await this.warmBlueprintCache(dependency.workflow_data);
    }

    // Sync cache read for the hot path — warmBlueprintCache runs before compilation, so
    // execution-time lookups never hit the async import.
    public getBlueprint(id: Blueprint.Id): Blueprint | undefined {
        return this.blueprintCache.get(id);
    }

    public async getLoader(
        blueprintId: Blueprint.Id,
        loaderId: Field.ResourceLoader.LoaderId,
    ): Promise<Loader.Fn | null> {
        const NodeClass = await this.getNodeConstructor(blueprintId);
        if (!NodeClass) return null;
        return (NodeClass as any).loaders?.[loaderId] ?? null;
    }

    private getNodeDependency(wfNode: Workflow.Node.Raw, wfData: Workflow.Data){
        if(!wfNode.dependencyRef)
            return null;

        const { workflowId, mode } = wfNode.dependencyRef;

        const store = mode === "publication"
            ? wfData.dependencies?.published
            : wfData.dependencies?.draft;

        if(!store?.[workflowId])
            throw new Error(`Node ${wfNode.id} has a dependency (${workflowId}) but its not in the store`)

        return store[workflowId]
    }

    public async resolveWorkflowNode(
        wfNode: Workflow.Node.Raw,
        staticValues: Workflow.Data["staticValues"][Workflow.Node.Id],
        wfData: Workflow.Data
    ): Promise<{ RuntimeNode: NodeConstructor; blueprint: Blueprint }>  {
        
        const depedency = this.getNodeDependency(wfNode, wfData)

        // if the node doesnt have a dependency, get its runtime and blueprint like normal
        if (!depedency) {
            const RuntimeNode = await this.getNodeConstructor(wfNode.blueprintId);
            const blueprint   = await this.resolveBlueprint(wfNode.blueprintId, staticValues)

            if(!RuntimeNode)
                throw new Error(`Could not get the RuntimeNode constructor for ${wfNode.blueprintId}`) 
            if(!blueprint)
                throw new Error(`Could not get the resolved blueprint for ${wfNode.blueprintId} for node ${wfNode.id}`)

            return { RuntimeNode, blueprint } 
        }
        
        // A dependency node's blueprint id is cosmetic; it runs as a SubWorkflow Execute.
        const RuntimeNode    = await this.getNodeConstructor(SUBWORKFLOW_EXECUTE_BLUEPRINT_ID);
        const dummyBlueprint = await this.loadBaseBlueprint(SUBWORKFLOW_EXECUTE_BLUEPRINT_ID) as Blueprint;

        if (!RuntimeNode || !dummyBlueprint)
            throw new Error(`Could not resolve node ${wfNode.id} with dependency ${depedency.workflow_id}. Core.SubWorkflow.Execute node not found in the catalogue`)
        
        return { RuntimeNode, blueprint: dummyBlueprint };
    }
}

export const CatalogueService = container.resolve(CatalogueServiceImpl);

export function RegisterNode(blueprintId: Blueprint.Id) {
    return function (constructor: new (...args: any[]) => RuntimeNode<any, any>) {
        CatalogueServiceImpl.register(blueprintId, constructor as NodeConstructor);
    };
}
