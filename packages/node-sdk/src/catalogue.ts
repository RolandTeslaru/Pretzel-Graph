import { container, singleton } from "tsyringe";
import { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import type { RuntimeNode } from "./node";
import type { Loader } from "./builders/loaders";
import { pickReconcilingValues } from "./utils/mapFieldValues";

export type NodeConstructor = {
    new(
        nodeId: Workflow.Node.Id,
        context: RuntimeNode.ExecutionContext
    ): RuntimeNode<any, any>;
}

@singleton()
class CatalogueServiceImpl {
    private static registry = new Map<Foundations.Blueprint.Id, NodeConstructor>();
    private __registry = CatalogueServiceImpl.registry;

    public static register(
        blueprintId: Foundations.Blueprint.Id, 
        constructor: NodeConstructor
    ) {
        if (this.registry.has(blueprintId))
            console.warn(`[NodeRegistry] Overwriting node type: ${blueprintId}`);

        this.registry.set(blueprintId, constructor);
    }

    private nodesRoot: string = "";

    // Base + reconciled blueprints in one map. ReconciledId is a Blueprint.Id sub-brand,
    // so a reconciled variant keys the same cache as its base.
    private blueprintCache = new Map<Foundations.Blueprint.Id, Foundations.Blueprint>();

    public setNodesRoot(rootPath: string) {
        this.nodesRoot = rootPath;
    }

    public async getNode(blueprintId: Foundations.Blueprint.Id) {
        if (this.__registry.has(blueprintId))
            return this.__registry.get(blueprintId);

        if (!this.nodesRoot)
            throw new Error(`[CatalogueService] nodesRoot not set. Call setNodesRoot() before loading nodes.`);

        const relativePath = blueprintId.replace(/\./g, "/");
        const fullPath = `${this.nodesRoot}/${relativePath}/node`;

        try {
            await import(fullPath);

            if (this.__registry.has(blueprintId))
                return this.__registry.get(blueprintId);

            throw new Error(`Module loaded from ${relativePath} but did not register '${blueprintId}'. Check the @RegisterNode decorator.`);

        } catch (error) {
            console.error(`[CatalogueService] Failed to load node '${blueprintId}':`, error);
            return null;
        }
    }

    public async loadBlueprint(blueprintId: Foundations.Blueprint.Id): Promise<Foundations.Blueprint | null> {
        const cached = this.blueprintCache.get(blueprintId);
        if (cached) return cached;

        if (!this.nodesRoot)
            throw new Error(`[CatalogueService] nodesRoot not set. Call setNodesRoot() before loading blueprints.`);

        const relativePath = blueprintId.replace(/\./g, "/");
        const fullPath = `${this.nodesRoot}/${relativePath}/blueprint`;

        try {
            const module = await import(fullPath);
            const blueprint = (module.Blueprint ?? null) as Foundations.Blueprint | null;
            if (blueprint) this.blueprintCache.set(blueprintId, blueprint);
            return blueprint;

        } catch (error) {
            console.error(`[CatalogueService] Failed to load blueprint '${blueprintId}':`, error);
            return null;
        }
    }

    // Resolve the (possibly reconciled) blueprint for a node's field values. Pure + content-addressed:
    // the reconciler folds structure from base off `fieldValues`, keyed/cached by reconciledId.
    public async reconcile(
        blueprintId: Foundations.Blueprint.Id,
        fieldValues: Record<Foundations.Field.Id, Foundations.Field.Value>,
    ): Promise<Foundations.Blueprint | null> {
        const base = await this.loadBlueprint(blueprintId);
        if (!base) return null;

        const reconciledId = Foundations.Blueprint.createReconciledId(blueprintId, base.fields, fieldValues);
        const cached = this.blueprintCache.get(reconciledId);
        if (cached) return cached;

        const reconciler = await this.getReconciler(blueprintId);
        if (!reconciler) return base;

        // Reconcilers see only reconcile-field values — the same set that keys reconciledId.
        const reconciled = reconciler(structuredClone(base), pickReconcilingValues(base.fields, fieldValues));
        this.blueprintCache.set(reconciledId, reconciled);
        return reconciled;
    }

    // Sync cache read for the hot path — the compiler warms the cache (loadBlueprint/reconcile/
    // registerBlueprint) during prepareNode, so execution-time lookups never hit the async import.
    public getBlueprint(id: Foundations.Blueprint.Id): Foundations.Blueprint | undefined {
        return this.blueprintCache.get(id);
    }

    public registerBlueprint(id: Foundations.Blueprint.Id, blueprint: Foundations.Blueprint): void {
        this.blueprintCache.set(id, blueprint);
    }

    public async getReconciler(blueprintId: Foundations.Blueprint.Id) {
        if (!this.nodesRoot)
            throw new Error(`[CatalogueService] nodesRoot not set. Call setNodesRoot() before loading reconcilers.`);

        const relativePath = blueprintId.replace(/\./g, "/");
        const fullPath = `${this.nodesRoot}/${relativePath}/reconcile`;

        try {
            const module = await import(fullPath);
            return module.reconcile || module.default;

        } catch (error: any) {
            if (error.code === "MODULE_NOT_FOUND" || error.code === "ERR_MODULE_NOT_FOUND") {
                return (blueprint: Foundations.Blueprint) => blueprint;
            }

            console.error(`[CatalogueService] Failed to load reconcile for '${blueprintId}':`, error);
            return null;
        }
    }

    public async getLoader(
        blueprintId: Foundations.Blueprint.Id,
        loaderId: Foundations.Field.ResourceLoader.LoaderId,
    ): Promise<Loader.Fn | null> {
        const NodeClass = await this.getNode(blueprintId);
        if (!NodeClass) return null;
        return (NodeClass as any).loaders?.[loaderId] ?? null;
    }
}

export const CatalogueService = container.resolve(CatalogueServiceImpl);

export function RegisterNode(blueprintId: Foundations.Blueprint.Id) {
    return function (constructor: new (...args: any[]) => RuntimeNode<any, any>) {
        CatalogueServiceImpl.register(blueprintId, constructor as NodeConstructor);
    };
}
