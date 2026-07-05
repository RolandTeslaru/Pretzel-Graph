import { z } from "zod"
import { Port } from "../Foundations/Port";
import { EdgeId, NodeId } from "./ids";


export namespace Edge {
    export const Id = EdgeId;
    export type Id = z.infer<typeof Id>;

    export const Schema = z.object({
        id: Edge.Id,
        source: z.object({
            nodeId: NodeId,
            portId: Port.Output.Id
        }),
        target: z.object({
            nodeId: NodeId,
            portId: Port.Input.Id,
        })
    })

    export function createId(
        _sourceNodeId: NodeId,
        _sourcePortId: Port.Output.Id,
        _targetNodeId: NodeId,
        _targetPortId: Port.Input.Id
    ) {
        return `${_sourceNodeId}|${_sourcePortId}|${_targetNodeId}|${_targetPortId}` as EdgeId
    }

    // Inverse of createId: the id fully encodes the endpoints, so the object is derivable.
    // Persisted edges are stored id-only; the fat form is rebuilt here (into the cache) on read.
    export function fromId(id: Edge.Id): Edge {
        const [sourceNodeId, sourcePortId, targetNodeId, targetPortId] = id.split("|");
        return {
            id,
            source: { nodeId: sourceNodeId as NodeId, portId: sourcePortId as Port.Output.Id },
            target: { nodeId: targetNodeId as NodeId, portId: targetPortId as Port.Input.Id },
        };
    }
}
export interface Edge extends z.infer<typeof Edge.Schema> { }