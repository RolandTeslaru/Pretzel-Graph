import { Workflow } from "./Workflow"
import { Port } from "./Foundations/Port"

export namespace Assistant {

    // The hidden workflow the assistant runs, at a reserved id.
    export const WORKFLOW_ID = Workflow.Id.parse("00000000-0000-4000-8000-000000000002")

    // The assistant workflow's exposed input port that receives the editor's context.
    export const CONTEXT_PORT_ID = "context" as Port.Input.Id

    // What the editor hands the assistant on every message.
    export type Context = {
        workflowId: Workflow.Id
    }
}
