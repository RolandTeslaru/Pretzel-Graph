import { Workflow } from "./Workflow"
import { Port } from "./Foundations/Port"

export namespace Assistant {

    // The hidden workflow the assistant runs, seeded on boot.
    export const WORKFLOW_ID = Workflow.Id.parse("bcca29fa-0328-4231-91ad-f87ccb6bbae3")

    // The assistant workflow's exposed input port that receives the editor's context.
    export const CONTEXT_PORT_ID = "context" as Port.Input.Id

    // What the editor hands the assistant on every message.
    export type Context = {
        workflowId: Workflow.Id
    }
}
