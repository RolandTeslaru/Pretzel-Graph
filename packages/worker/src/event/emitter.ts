import { Chat, ExecutionSession, Orchestrator, Realtime } from "@vx-agent-editor/shared/domain";


export type Emitter = <T_Event extends Realtime.Event>(event: T_Event) => void
