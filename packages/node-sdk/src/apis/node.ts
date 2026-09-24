import type { Workflow } from "@pretzel-graph/shared/domain";
import type { Port } from "@pretzel-graph/shared/domain/Foundations/Port";



// Writes a value onto one of this node's output ports so downstream nodes can read it.
export interface PortAPI {
    write: (
        nodeId: Workflow.Node.Id,
        outputId: Port.Output.Id,
        value: unknown,
    ) => void,
}



// Given to a sub-workflow's ExposeOutputPort nodes so they can write/emit directly on the
// parent Execute-sub-workflow node's own ports as they fire, bypassing normal port wiring.
export interface EnclosingNodeAPI {
    writePort: (
        outputId: Port.Output.Id,
        value: unknown,
    ) => void,
    emitPort: (
        outputId: Port.Output.Id,
    ) => void,
}
