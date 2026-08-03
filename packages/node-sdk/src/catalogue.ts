import { container, singleton } from "tsyringe";
import { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import type { RuntimeNode } from "./node";
import type { Loader } from "./builders/loaders";

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

    // Base + resolved derivative blueprints share one cache. ReconciledId remains the persisted
    // workflow brand, but every non-base cache key is now a derivative path.
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

    // Resolve a blueprint's derivative for the supplied field values. Static blueprints return
    // their base unchanged; there is no dynamic module or mutation fallback.
    public async resolveBlueprint(
        blueprintId: Foundations.Blueprint.Id,
        fieldValues: Record<Foundations.Field.Id, Foundations.Field.Value>,
    ): Promise<Foundations.Blueprint | null> {
        const base = await this.loadBlueprint(blueprintId);
        if (!base) return null;

        if (!base._derivatives?.length)
            return base;

        const resolvedId = Foundations.Blueprint.deriveId(base, fieldValues);
        const cached = this.blueprintCache.get(resolvedId);
        if (cached) return cached;

        const { blueprint } = Foundations.Blueprint.derive(base, fieldValues);
        this.blueprintCache.set(resolvedId, blueprint);
        return blueprint;
    }

    // Sync cache read for the hot path — the compiler warms the cache (loadBlueprint/resolveBlueprint/
    // registerBlueprint) during prepareNode, so execution-time lookups never hit the async import.
    public getBlueprint(id: Foundations.Blueprint.Id): Foundations.Blueprint | undefined {
        return this.blueprintCache.get(id);
    }

    public registerBlueprint(id: Foundations.Blueprint.Id, blueprint: Foundations.Blueprint): void {
        this.blueprintCache.set(id, blueprint);
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
