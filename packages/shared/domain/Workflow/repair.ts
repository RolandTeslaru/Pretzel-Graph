import { z } from "zod"
import { Blueprint } from "../Foundations/Blueprint"
import { Data } from "./data"
import { Edge } from "./edge"
import { Node } from "./node"

export namespace Repair {
    export const MissingBlueprint = z.object({
        code:        z.literal("MISSING_BLUEPRINT"),
        nodeId:      Node.Id,
        blueprintId: Blueprint.Id,
        resolution:  z.literal("REMOVE_NODE"),
    })
    export type MissingBlueprint = z.infer<typeof MissingBlueprint>

    export const MissingBlueprintDerivative = z.object({
        code:                          z.literal("MISSING_BLUEPRINT_DERIVATIVE"),
        nodeId:                        Node.Id,
        blueprintId:                   Blueprint.Id,
        previousReconciledBlueprintId: Blueprint.ReconciledId,
        resolution:                    z.literal("RESET_TO_BASE"),
    })
    export type MissingBlueprintDerivative = z.infer<typeof MissingBlueprintDerivative>

    export const Schema = z.discriminatedUnion("code", [
        MissingBlueprint,
        MissingBlueprintDerivative,
    ])

    /**
     * Applies user-approved recovery instructions to a detached workflow-data value.
     * The source is never mutated: loading can be cancelled before this function is called,
     * and callers receive a fresh value suitable for opening in the editor.
     */
    export function applyAll(data: Data, repairs: readonly Repair[]): {
        data:    Data
        applied: number
    } {
        const repaired = structuredClone(data)
        const removed  = new Set<Node.Id>()
        let applied    = 0

        for (const repair of repairs) {
            const node = repaired.nodes[repair.nodeId]
            if (!node)
                continue

            if (repair.code === "MISSING_BLUEPRINT") {
                if (node.blueprintId !== repair.blueprintId)
                    continue

                removed.add(node.id)
                delete repaired.nodes[node.id]
                delete repaired.staticValues[node.id]
                delete repaired.credentialInstanceIds[node.id]
                delete repaired.ui.layout[node.id]
                applied++
                continue
            }

            if (
                node.blueprintId !== repair.blueprintId ||
                node.reconciledBlueprintId !== repair.previousReconciledBlueprintId
            )
                continue

            delete node.reconciledBlueprintId
            applied++
        }

        if (removed.size)
            repaired.edges = repaired.edges.filter(edgeId => {
                const edge = Edge.fromId(edgeId)
                return !removed.has(edge.source.nodeId) && !removed.has(edge.target.nodeId)
            })

        return { data: repaired, applied }
    }
}
export type Repair = z.infer<typeof Repair.Schema>
