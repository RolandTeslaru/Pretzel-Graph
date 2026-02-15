import path from "path";
import { container, singleton } from "tsyringe";
import { Runtime } from "src/runtime";
import { Foundations, Workflow } from "@vx-agent-editor/shared/domain";

export type NodeConstructor = {
    new(workflowNode: Workflow.Node): Runtime.Node<Foundations.Blueprint>;
    onReconcile(
        changedFieldId: Foundations.Field.Id,
        newValue: Foundations.Field.Value,
    ): Foundations.Blueprint;
}

@singleton()
class CatalogueServiceImpl {
    // Seperete static and instance registry because i cannot use the instance registry in the static method Register
    private static registry = new Map<Foundations.Blueprint.Id, NodeConstructor>();
    private __registry = CatalogueServiceImpl.registry;

    public static register(blueprintId: Foundations.Blueprint.Id, constructor: NodeConstructor) {
        if (CatalogueServiceImpl.registry.has(blueprintId))
            console.warn(`[NodeRegistry] Overwriting node type: ${blueprintId}`);

        CatalogueServiceImpl.registry.set(blueprintId, constructor);
    }

    private nodesRoot: string;

    constructor() {
        this.nodesRoot = path.resolve(__dirname, "../../nodes");
    }

    public async getNode(blueprintId: Foundations.Blueprint.Id) {
        // 1. Check Memory Cache (Registry)
        if (this.__registry.has(blueprintId))
            return this.__registry.get(blueprintId);

        // 2. Convention over Configuration: Resolve Path
        // "Google.Chat.v1" -> "Google/Chat/v1"
        const relativePath = blueprintId.replace(/\./g, "/");
        const fullPath = path.join(this.nodesRoot, relativePath + "/node");

        try {
            await import(fullPath);

            // check registry after dynamic import
            if (this.__registry.has(blueprintId))
                return this.__registry.get(blueprintId);

            throw new Error(`Module loaded from ${relativePath} but it did not register '${blueprintId}'. Check the @RegisterNode decorator.`);

        } catch (error) {
            console.error(`[CatalogueService] Failed to load node '${blueprintId}':`, error);
            return null;
        }
    }

    public async getReconciler(blueprintId: Foundations.Blueprint.Id) {
        // 1. Convention over Configuration: Resolve Path
        // "Google.Chat.v1" -> "Google/Chat/v1"
        const relativePath = blueprintId.replace(/\./g, "/");
        const fullPath = path.join(this.nodesRoot, relativePath + "/reconcile");
        const blueprintPath = path.join(this.nodesRoot, relativePath + "/blueprint");

        try {
            // Try importing reconcile.ts
            const module = await import(fullPath);
            return module.reconcile || module.default;

        } catch (error: any) {
            // If reconcile.ts doesn't exist, try to load blueprint and return default Identity reconcile
            if (error.code === 'MODULE_NOT_FOUND') {
                try {
                    const bpModule = await import(blueprintPath);
                    const Blueprint = bpModule.Blueprint;
                    return () => Blueprint;
                } catch (bpError) {
                    console.error(`[CatalogueService] Failed to load blueprint for '${blueprintId}':`, bpError);
                    return null;
                }
            }

            console.error(`[CatalogueService] Failed to load reconcile for '${blueprintId}':`, error);
            return null;
        }
    }
}


export const CatalogueService = container.resolve(CatalogueServiceImpl);

export function RegisterNode(blueprintId: Foundations.Blueprint.Id) {
    return function (constructor: NodeConstructor) {
        CatalogueServiceImpl.register(blueprintId, constructor);
    };
}