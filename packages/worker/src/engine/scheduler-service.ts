import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { Vertex } from "../S2/graph";
import type { AggexEngine } from "./index";

/**
 * The single typed boundary to S2's override surface (`s2Engine.overrides.*`).
 * Translates Workflow.Node ids → Vertex ids and forwards firing/signal mutations.
 */
export class SchedulerService {
    constructor(private engine: AggexEngine) {}

    public readonly fireNode = (ctx: AggexEngine.Execution.Context, nodeId: Workflow.Node.Id, signals: Set<Workflow.Node.Id | Vertex.Id> = new Set()) => {
        this.engine.s2Engine.overrides.fireVertex(nodeId as unknown as Vertex.Id, signals as Set<Vertex.Id>);
    }

    public readonly signalNode = (ctx: AggexEngine.Execution.Context, nodeId: Workflow.Node.Id, fromNodeId: Workflow.Node.Id) => {
        this.engine.s2Engine.overrides.addSignal(nodeId as unknown as Vertex.Id, fromNodeId as unknown as Vertex.Id);
    }

    public readonly removeSignal = (ctx: AggexEngine.Execution.Context, nodeId: Workflow.Node.Id, fromNodeId: Workflow.Node.Id) => {
        this.engine.s2Engine.overrides.removeSignal(nodeId as unknown as Vertex.Id, fromNodeId as unknown as Vertex.Id);
    }

    public readonly clearSignals = (ctx: AggexEngine.Execution.Context, nodeId: Workflow.Node.Id) => {
        this.engine.s2Engine.overrides.clearSignals(nodeId as unknown as Vertex.Id);
    }

    public readonly scheduleCheck = (ctx: AggexEngine.Execution.Context, nodeId: Workflow.Node.Id) => {
        this.engine.s2Engine.overrides.scheduleCheck(nodeId as unknown as Vertex.Id);
    }
}
