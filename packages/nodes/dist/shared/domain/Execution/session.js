"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Session = void 0;
const zod_1 = __importDefault(require("zod"));
const Workflow_1 = require("../Workflow");
const Port_1 = require("../Foundations/Port");
const Projection_1 = require("../Foundations/Projection");
const SystemError_1 = require("../SystemError");
const zod_utils_1 = require("../zod-utils");
const Consultation_1 = require("../Consultation");
// ─── Session ──────────────────────────────────────────────────────────────
// Embedded runtime-state blob. No separate id — identified by the execution's id.
var Session;
(function (Session) {
    let NodeStatus;
    (function (NodeStatus) {
        NodeStatus.Schema = zod_1.default.object({
            status: zod_1.default.enum(["idle", "running", "completed", "waiting", "failed"]),
            error: SystemError_1.SystemError.Schema.optional(),
            started_at: zod_utils_1.supabaseTimestamp.optional(),
            completed_at: zod_utils_1.supabaseTimestamp.optional(),
        });
        NodeStatus.IDLE = { status: "idle" };
    })(NodeStatus = Session.NodeStatus || (Session.NodeStatus = {}));
    let EdgeState;
    (function (EdgeState) {
        EdgeState.Schema = zod_1.default.object({
            status: zod_1.default.enum(["idle", "preparing", "waiting", "completed"]),
            runCount: zod_1.default.number().default(0),
        });
        EdgeState.IDLE = { status: "idle", runCount: 0 };
    })(EdgeState = Session.EdgeState || (Session.EdgeState = {}));
    Session.Schema = zod_1.default.object({
        node_status: zod_1.default.record(Workflow_1.Workflow.Node.Id, NodeStatus.Schema).default({}),
        edge_state: zod_1.default.record(Workflow_1.Workflow.Edge.Id, EdgeState.Schema).default({}),
        metadata: zod_1.default.record(zod_1.default.string(), zod_1.default.any()).default({}),
        pending_consultations: zod_1.default.record(Consultation_1.Consultation.Id, Consultation_1.Consultation.Request).default({}),
        node_output_instances: zod_1.default.record(Workflow_1.Workflow.Node.Id, zod_1.default.any()).default({}),
        node_output_projections: zod_1.default.record(Workflow_1.Workflow.Node.Id, zod_1.default.record(Port_1.Port.Output.Id, Projection_1.Projection.Schema)).default({}),
    });
    Session.Partial = Session.Schema.partial();
    // Key removals. Upserting merges (Object.assign) and so can never drop a key, which is
    // why removals travel separately: { pending_consultations: { [id]: true } }.
    Session.Deletion = zod_1.default.object({
        node_status: zod_1.default.record(Workflow_1.Workflow.Node.Id, zod_1.default.literal(true)),
        edge_state: zod_1.default.record(Workflow_1.Workflow.Edge.Id, zod_1.default.literal(true)),
        metadata: zod_1.default.record(zod_1.default.string(), zod_1.default.literal(true)),
        pending_consultations: zod_1.default.record(Consultation_1.Consultation.Id, zod_1.default.literal(true)),
        node_output_instances: zod_1.default.record(Workflow_1.Workflow.Node.Id, zod_1.default.literal(true)),
        node_output_projections: zod_1.default.record(Workflow_1.Workflow.Node.Id, zod_1.default.literal(true)),
    }).partial();
    // One partial change set. `upsert` merges keys in, `delete` drops them; a single patch
    // may carry both, and `upsert` is applied first.
    Session.Patch = zod_1.default.object({
        upsert: Session.Partial,
        delete: Session.Deletion,
    }).partial();
    Session.createInitial = () => Session.Schema.parse({});
})(Session || (exports.Session = Session = {}));
