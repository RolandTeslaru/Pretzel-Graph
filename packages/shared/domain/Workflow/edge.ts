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
}
export interface Edge extends z.infer<typeof Edge.Schema> { }