import path from "path";
import { singleton } from "tsyringe";
import { Foundations } from "../../nodes/foundations";
import { Workflow } from "@vx-agent-builder/shared/types/Workflow";

export interface NodeConstructor {
    new(workflowNode: Workflow.Node): Foundations.Node<Foundations.Node.Definition>;
    Definition: Foundations.Node.Definition
}

@singleton()
export class CatalogueService {
    // Static Registry accessible by Decorators
    public static Registry = new Map<string, NodeConstructor>();

    // The Decorator Factory
    public static Register(nodeType: string) {
        return function (constructor: NodeConstructor) {
            if (CatalogueService.Registry.has(nodeType)) {
                console.warn(`[NodeRegistry] Overwriting node type: ${nodeType}`);
            }
            CatalogueService.Registry.set(nodeType, constructor);
        };
    }

    private nodesRoot: string;

    constructor() {
        // Assuming this code runs in dist/services/Catalogue/service.js
        // trying to reach dist/nodes
        // We might need to adjust this based on actual project structure (src vs dist)
        this.nodesRoot = path.resolve(__dirname, "../../nodes");
    }

    /**
     * Resolves a node by its namespace path (e.g., "Google/Chat" or "Google.Chat").
     * This relies on the file structure matching the identifier.
     * 
     * @param nodeIdentifier The structural identifier (e.g. "Google/Chat")
     */
    async getNode(nodeIdentifier: string) {
        // 1. Check Memory Cache (Registry)
        if (CatalogueService.Registry.has(nodeIdentifier)) {
            return CatalogueService.Registry.get(nodeIdentifier);
        }

        // 2. Convention over Configuration: Resolve Path
        // "Google.Chat" -> "Google/Chat"
        const relativePath = nodeIdentifier.replace(/\./g, "/");
        const fullPath = path.join(this.nodesRoot, relativePath);

        try {
            // 3. Dynamic Import (Triggers @RegisterNode side-effect)
            await import(fullPath);

            // 4. Check Registry Again
            if (CatalogueService.Registry.has(nodeIdentifier)) {
                return CatalogueService.Registry.get(nodeIdentifier);
            }

            // Fallback: If the decorator ID didn't match the filename ID
            // We might want to warn or just fail.
            // But usually, strict convention means they match.
            throw new Error(`Module loaded from ${relativePath} but it did not register '${nodeIdentifier}'. Check the @RegisterNode decorator.`);

        } catch (error) {
            console.error(`[CatalogueService] Failed to load node '${nodeIdentifier}':`, error);
            return null;
        }
    }
}
