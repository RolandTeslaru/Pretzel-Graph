import path from "path";
import { container, singleton } from "tsyringe";
import { Workflow } from "@vx-agent-editor/shared/types/Workflow";
import { Runtime } from "src/runtime";
import { Foundations } from "@vx-agent-editor/shared/types";

export interface NodeConstructor {
    new(workflowNode: Workflow.Node): Runtime.Node<Foundations.NodeDefinition>;
    Definition: Foundations.NodeDefinition
}

@singleton()
class CatalogueServiceImpl {
    // Seperete static and instance registry because i cannot use the instance registry in the static method Register
    private static registry = new Map<Foundations.NodeDefinition.Id, NodeConstructor>();
    private __registry = CatalogueServiceImpl.registry;

    public Register(definitionId: Foundations.NodeDefinition.Id) {
        
        return function (constructor: NodeConstructor) {
            if (CatalogueServiceImpl.registry.has(definitionId))
                console.warn(`[NodeRegistry] Overwriting node type: ${definitionId}`);

            CatalogueServiceImpl.registry.set(definitionId, constructor);
        };
    }

    private nodesRoot: string;

    constructor() {
        this.nodesRoot = path.resolve(__dirname, "../../nodes");
    }

    public async getNode(definitionId: Foundations.NodeDefinition.Id) {
        // 1. Check Memory Cache (Registry)
        if (this.__registry.has(definitionId))
            return this.__registry.get(definitionId);

        // 2. Convention over Configuration: Resolve Path
        // "Google.Chat.v1" -> "Google/Chat/v1"
        const relativePath = definitionId.replace(/\./g, "/");
        const fullPath = path.join(this.nodesRoot, relativePath);

        try {
            await import(fullPath);

            // check registry after dynamic import
            if (this.__registry.has(definitionId))
                return this.__registry.get(definitionId);

            throw new Error(`Module loaded from ${relativePath} but it did not register '${definitionId}'. Check the @RegisterNode decorator.`);

        } catch (error) {
            console.error(`[CatalogueService] Failed to load node '${definitionId}':`, error);
            return null;
        }
    }
}


export const CatalogueService = container.resolve(CatalogueServiceImpl);