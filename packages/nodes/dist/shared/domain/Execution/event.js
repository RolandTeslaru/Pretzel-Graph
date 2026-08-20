"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = void 0;
const zod_1 = __importDefault(require("zod"));
const Workflow_1 = require("../Workflow");
const Port_1 = require("../Foundations/Port");
const SystemError_1 = require("../SystemError");
const session_1 = require("./session");
const recording_1 = require("./recording");
const EventBase = __importStar(require("./event-base"));
// ─── Events ───────────────────────────────────────────────────────────────
// Single channel per execution: execution:<executionId>
// Carries both lifecycle events and per-node progress events.
//
// Other execution-scoped domains publish their own unions on the same channel by
// extending Base — see Consultation.Event. This union stays Execution's own.
var Event;
(function (Event) {
    Event.Channel = EventBase.Channel;
    Event.getChannel = EventBase.getChannel;
    Event.Base = EventBase.Base;
    // ─── Lifecycle ───────────────────────────────────────────────────────
    // The run's own state transitions. Mirrors of the lifecycle *signals* that
    // request them — Execution.Signal.Pause asks, Lifecycle.Paused confirms.
    let Lifecycle;
    (function (Lifecycle) {
        Lifecycle.Started = Event.Base.extend({ type: zod_1.default.literal('lifecycle:started') });
        Lifecycle.Paused = Event.Base.extend({ type: zod_1.default.literal('lifecycle:paused'), session: session_1.Session.Schema });
        Lifecycle.Resumed = Event.Base.extend({ type: zod_1.default.literal('lifecycle:resumed'), session: session_1.Session.Schema });
        Lifecycle.Completed = Event.Base.extend({ type: zod_1.default.literal('lifecycle:completed'), session: session_1.Session.Schema });
        Lifecycle.Failed = Event.Base.extend({ type: zod_1.default.literal('lifecycle:failed'), session: session_1.Session.Schema, error: SystemError_1.SystemError.Schema });
        Lifecycle.Suspended = Event.Base.extend({ type: zod_1.default.literal('lifecycle:suspended'), session: session_1.Session.Schema });
        Lifecycle.Terminated = Event.Base.extend({ type: zod_1.default.literal('lifecycle:terminated') });
    })(Lifecycle = Event.Lifecycle || (Event.Lifecycle = {}));
    // ─── Session ─────────────────────────────────────────────────────────
    // A standalone change to the run's session state. Node events carry their own
    // sessionPatch alongside what they report; this is the patch on its own, for
    // changes no single node event owns.
    let Session;
    (function (Session) {
        Session.Patch = Event.Base.extend({
            type: zod_1.default.literal('session:patch'),
            sessionPatch: session_1.Session.Patch,
        });
    })(Session = Event.Session || (Event.Session = {}));
    let Node;
    (function (Node) {
        Node.Started = Event.Base.extend({
            type: zod_1.default.literal('node:started'),
            nodeId: Workflow_1.Workflow.Node.Id,
            sessionPatch: session_1.Session.Patch,
        });
        Node.Completed = Event.Base.extend({
            type: zod_1.default.literal('node:completed'),
            nodeId: Workflow_1.Workflow.Node.Id,
            output: zod_1.default.unknown(),
            sessionPatch: session_1.Session.Patch,
        });
        Node.Error = Event.Base.extend({
            type: zod_1.default.literal('node:error'),
            nodeId: Workflow_1.Workflow.Node.Id,
            error: SystemError_1.SystemError.Schema,
            sessionPatch: session_1.Session.Patch,
        });
        Node.Waiting = Event.Base.extend({
            type: zod_1.default.literal('node:waiting'),
            nodeId: Workflow_1.Workflow.Node.Id,
            sessionPatch: session_1.Session.Patch,
        });
    })(Node = Event.Node || (Event.Node = {}));
    // ─── Recording events ────────────────────────────────────────────────
    // Sent on the same execution channel. Frontend applies each as a
    // direct patch to its local recording state.
    let Recording;
    (function (Recording) {
        let Unit;
        (function (Unit) {
            Unit.Started = Event.Base.extend({
                type: zod_1.default.literal("unit:started"),
                unit: recording_1.Recording.UnitOfWork.Schema,
            });
            Unit.Completed = Event.Base.extend({
                type: zod_1.default.literal("unit:completed"),
                unitId: recording_1.Recording.UnitOfWork.Id,
                duration: zod_1.default.number(),
                outputSnapshot: zod_1.default.record(Port_1.Port.Output.Id, recording_1.Recording.DataBank.PortSnapshot.Id),
                metrics: zod_1.default.record(zod_1.default.string(), recording_1.Recording.Metric.Schema).optional(),
            });
            Unit.Failed = Event.Base.extend({
                type: zod_1.default.literal("unit:failed"),
                unitId: recording_1.Recording.UnitOfWork.Id,
                duration: zod_1.default.number(),
                metrics: zod_1.default.record(zod_1.default.string(), recording_1.Recording.Metric.Schema).optional(),
            });
        })(Unit = Recording.Unit || (Recording.Unit = {}));
        let Relation;
        (function (Relation) {
            Relation.Created = Event.Base.extend({
                type: zod_1.default.literal("relation:created"),
                relation: recording_1.Recording.Relation.Schema,
            });
            Relation.CreateBatch = Event.Base.extend({
                type: zod_1.default.literal("relation:createBatch"),
                relations: zod_1.default.array(recording_1.Recording.Relation.Schema),
            });
        })(Relation = Recording.Relation || (Recording.Relation = {}));
        Recording.Completed = Event.Base.extend({
            type: zod_1.default.literal("recording:completed"),
        });
        Recording.FullyUploaded = Event.Base.extend({
            type: zod_1.default.literal("recording:fullyUploaded"),
        });
    })(Recording = Event.Recording || (Event.Recording = {}));
    Event.Schema = zod_1.default.discriminatedUnion("type", [
        Lifecycle.Started, Lifecycle.Paused, Lifecycle.Resumed, Lifecycle.Suspended,
        Lifecycle.Terminated, Lifecycle.Completed, Lifecycle.Failed,
        Session.Patch,
        Node.Started, Node.Completed, Node.Error, Node.Waiting,
        Recording.Unit.Started, Recording.Unit.Completed, Recording.Unit.Failed,
        Recording.Relation.Created, Recording.Relation.CreateBatch,
        Recording.Completed, Recording.FullyUploaded,
    ]);
    // Returns a member without its addressing; the publisher derives that from the execution.
    Event.create = EventBase.defineEventFactory(Event.Schema);
})(Event || (exports.Event = Event = {}));
