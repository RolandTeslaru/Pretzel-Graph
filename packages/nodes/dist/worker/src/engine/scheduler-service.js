"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
/**
 * The single typed boundary to S2's override surface (`s2Engine.overrides.*`).
 * Translates Workflow.Node.Raw ids → Vertex ids and forwards firing/signal mutations.
 */
class SchedulerService {
    engine;
    constructor(engine) {
        this.engine = engine;
    }
    fireNode = (ctx, nodeId, signals = new Set()) => {
        this.engine.s2Engine.overrides.fireVertex(nodeId, signals);
    };
    signalNode = (ctx, nodeId, fromNodeId) => {
        this.engine.s2Engine.overrides.addSignal(nodeId, fromNodeId);
    };
    removeSignal = (ctx, nodeId, fromNodeId) => {
        this.engine.s2Engine.overrides.removeSignal(nodeId, fromNodeId);
    };
    clearSignals = (ctx, nodeId) => {
        this.engine.s2Engine.overrides.clearSignals(nodeId);
    };
    scheduleCheck = (ctx, nodeId) => {
        this.engine.s2Engine.overrides.scheduleCheck(nodeId);
    };
}
exports.SchedulerService = SchedulerService;
