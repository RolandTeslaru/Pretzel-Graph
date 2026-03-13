import { Chat, ExecutionSession, Orchestrator, Realtime } from "@vx-agent-editor/shared/domain";
import { EventBuilder } from "./builder";

export type EmitterEvent =
    | Orchestrator.Event
    | Chat.Event
    | ExecutionSession.Event

export type Emitter = <T_Event extends EmitterEvent>(event: T_Event) => void
