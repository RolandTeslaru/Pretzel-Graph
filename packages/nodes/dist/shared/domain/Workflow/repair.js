"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Repair = void 0;
const zod_1 = require("zod");
const Blueprint_1 = require("../Foundations/Blueprint");
const edge_1 = require("./edge");
const node_1 = require("./node");
var Repair;
(function (Repair) {
    Repair.MissingBlueprint = zod_1.z.object({
        code: zod_1.z.literal("MISSING_BLUEPRINT"),
        nodeId: node_1.Node.Id,
        blueprintId: Blueprint_1.Blueprint.Id,
        resolution: zod_1.z.literal("REMOVE_NODE"),
    });
    Repair.MissingBlueprintDerivative = zod_1.z.object({
        code: zod_1.z.literal("MISSING_BLUEPRINT_DERIVATIVE"),
        nodeId: node_1.Node.Id,
        blueprintId: Blueprint_1.Blueprint.Id,
        previousReconciledBlueprintId: Blueprint_1.Blueprint.ReconciledId,
        resolution: zod_1.z.literal("RESET_TO_BASE"),
    });
    Repair.Schema = zod_1.z.discriminatedUnion("code", [
        Repair.MissingBlueprint,
        Repair.MissingBlueprintDerivative,
    ]);
    /**
     * Applies user-approved recovery instructions to a detached workflow-data value.
     * The source is never mutated: loading can be cancelled before this function is called,
     * and callers receive a fresh value suitable for opening in the editor.
     */
    function applyAll(data, repairs) {
        const repaired = structuredClone(data);
        const removed = new Set();
        let applied = 0;
        for (const repair of repairs) {
            const node = repaired.nodes[repair.nodeId];
            if (!node)
                continue;
            if (repair.code === "MISSING_BLUEPRINT") {
                if (node.blueprintId !== repair.blueprintId)
                    continue;
                removed.add(node.id);
                delete repaired.nodes[node.id];
                delete repaired.staticValues[node.id];
                delete repaired.credentialInstanceIds[node.id];
                delete repaired.ui.layout[node.id];
                applied++;
                continue;
            }
            if (node.blueprintId !== repair.blueprintId ||
                node.reconciledBlueprintId !== repair.previousReconciledBlueprintId)
                continue;
            delete node.reconciledBlueprintId;
            applied++;
        }
        if (removed.size)
            repaired.edges = repaired.edges.filter(edgeId => {
                const edge = edge_1.Edge.fromId(edgeId);
                return !removed.has(edge.source.nodeId) && !removed.has(edge.target.nodeId);
            });
        return { data: repaired, applied };
    }
    Repair.applyAll = applyAll;
})(Repair || (exports.Repair = Repair = {}));
