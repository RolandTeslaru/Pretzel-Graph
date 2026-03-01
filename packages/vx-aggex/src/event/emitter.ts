import { Orchestrator } from "@vx-agent-editor/shared/domain";
import { EventBuilder } from "./builder";

export type Emitter = (
    callbackFn: (eventBuilder: EventBuilder) => Orchestrator.Event
) => void
