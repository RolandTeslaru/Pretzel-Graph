import { Chat, Orchestrator } from "@vx-agent-editor/shared/domain";
import { EventBuilder } from "./builder";

export type EmitterEvent =
    | Orchestrator.Event
    | Chat.Event

export type Emitter = (event: EmitterEvent) => void
