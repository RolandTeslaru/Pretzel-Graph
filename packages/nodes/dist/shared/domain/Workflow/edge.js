"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Edge = void 0;
const zod_1 = require("zod");
const Port_1 = require("../Foundations/Port");
const ids_1 = require("./ids");
var Edge;
(function (Edge) {
    Edge.Id = ids_1.EdgeId;
    Edge.Schema = zod_1.z.object({
        id: Edge.Id,
        source: zod_1.z.object({
            nodeId: ids_1.NodeId,
            portId: Port_1.Port.Output.Id
        }),
        target: zod_1.z.object({
            nodeId: ids_1.NodeId,
            portId: Port_1.Port.Input.Id,
        })
    });
    function createId(_sourceNodeId, _sourcePortId, _targetNodeId, _targetPortId) {
        return `${_sourceNodeId}|${_sourcePortId}|${_targetNodeId}|${_targetPortId}`;
    }
    Edge.createId = createId;
    // Inverse of createId: the id fully encodes the endpoints, so the object is derivable.
    // Persisted edges are stored id-only; the fat form is rebuilt here (into the cache) on read.
    function fromId(id) {
        const [sourceNodeId, sourcePortId, targetNodeId, targetPortId] = id.split("|");
        return {
            id,
            source: { nodeId: sourceNodeId, portId: sourcePortId },
            target: { nodeId: targetNodeId, portId: targetPortId },
        };
    }
    Edge.fromId = fromId;
})(Edge || (exports.Edge = Edge = {}));
