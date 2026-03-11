import { Orchestrator, Workflow } from "@vx-agent-editor/shared/domain"
import { StreamController } from "../StreamController";
import { z } from "zod"
import { Emitter } from "src/event/emitter";
import { StateController } from "./state";

export interface RuntimeContext {
    jobId: Orchestrator.Job.Id,
    streamController: StreamController,
    stateController: StateController
    emit: Emitter
    workflow: Readonly<Workflow>
    workflowCache: Readonly<Workflow.Cache>
}