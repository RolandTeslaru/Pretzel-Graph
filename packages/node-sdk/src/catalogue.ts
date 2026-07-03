import { container, singleton } from "tsyringe";
import { Foundations, Workflow } from "@pretzel-graph/shared/domain";
import type { RuntimeNode } from "./node";

export type NodeConstructor = {
    new(
        workflowNode: Workflow.Node,
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
    ): Promise<RuntimeNode.LoaderFn | null> {
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
