"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Signal = void 0;
const zod_1 = __importDefault(require("zod"));
const Realtime_1 = require("../Realtime");
const ids_1 = require("./ids");
// ─── Signals ──────────────────────────────────────────────────────────────
// Single signal channel per execution: execution:<executionId>:signal
//
// Every execution-scoped domain extends Base and travels on this one channel —
// see Consultation.Signal. This union stays Execution's own lifecycle signals.
// Already a leaf, so the domains extending it need no split.
var Signal;
(function (Signal) {
    Signal.Channel = Realtime_1.Realtime.Channel.brand("Execution.Signal.Channel");
    Signal.getChannel = (executionId) => `execution:${executionId}:signal`;
    Signal.Base = Realtime_1.Realtime.Signal.Base.extend({
        channel: Signal.Channel,
        executionId: ids_1.ExecutionId,
    });
    Signal.Terminate = Signal.Base.extend({ type: zod_1.default.literal("terminate") });
    Signal.Pause = Signal.Base.extend({ type: zod_1.default.literal("pause") });
    Signal.Resume = Signal.Base.extend({ type: zod_1.default.literal("resume") });
    Signal.Suspend = Signal.Base.extend({ type: zod_1.default.literal("suspend") });
    Signal.Heartbeat = Signal.Base.extend({ type: zod_1.default.literal("heartbeat") });
    Signal.Schema = zod_1.default.discriminatedUnion("type", [
        Signal.Terminate, Signal.Pause, Signal.Resume, Signal.Suspend, Signal.Heartbeat,
    ]);
})(Signal || (exports.Signal = Signal = {}));
