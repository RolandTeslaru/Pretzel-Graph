import type { Port } from "../Foundations/Port";
import type { Field } from "../Foundations/Field";
import type { Vault } from "../Vault";
import type { Edge } from "./edge";
import type { NodeId, EdgeId } from "../ids";

export interface Cache {

    resolvedShape: Record<NodeId, Cache.ResolvedShape>,

    // Expanded edges, rebuilt from the id-only `data.edges` on every cache build. This is the
    // derived source for the fat `{id, source, target}` shape; `data.edges` stays id-only.
    edges: Record<EdgeId, Edge>,
    // nodes coming
    incomingEdgesMap: Record<
        NodeId,     // the node where the edges are coming in
        Record<
            NodeId,     // the source node id
            EdgeId      // the edge id
        >
    >,
    outgoingEdgesMap: Record<
        NodeId,     // (source node id) the node where the edges are going out from
        Record<
            NodeId, // (target node id)
            EdgeId
        >
    >,
    inputEdgesByPort: Record<
        NodeId,
        Record<
            Port.Input.Id,
            EdgeId
        >
    >,
    outputEdgesByPort: Record<
        NodeId,
        Record<
            Port.Output.Id,
            EdgeId
        >
    >
}

export namespace Cache {
    export interface ResolvedShape {
        fields:      readonly Field[]
        inputs:      Port.Input[]
        outputs:     Port.Output[]
        credentials: readonly Vault.Credential.Template[]
    }

    // Node adjacency derived from the edges: each node mapped to the nodes it connects to.
    export type Arcs = Record<NodeId, Set<NodeId>>

    export const INITIAL = {
        edges: {},
        resolvedShape: {},
        incomingEdgesMap: {},
        outgoingEdgesMap: {},
        inputEdgesByPort: {},
        outputEdgesByPort: {},
    }
}
