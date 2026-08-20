"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Recording = void 0;
const zod_1 = __importDefault(require("zod"));
const Workflow_1 = require("../Workflow");
const Port_1 = require("../Foundations/Port");
const Projection_1 = require("../Foundations/Projection");
// ─── Recording ────────────────────────────────────────────────────────────
// Per-execution flight recorder data. 1:1 with Execution — identified by
// the execution's own id. Embedded as a nullable JSONB column on the
// executions row, so the recording lifecycle rides on the execution's.
var Recording;
(function (Recording) {
    // Default Redis TTL for the post-finalisation live cache.
    // The cache is only the "fresh read after recording:fullyUploaded"
    // path — Supabase is authoritative beyond that window.
    Recording.LIVE_TTL_SECONDS = 300;
    // ─── DataBank ────────────────────────────────────────────────────────
    // Flat store of port value snapshots. One entry per (uow, port) pair.
    // Input snapshots reference the same entries as the source UoW's
    // output snapshots — no duplication across the two.
    let DataBank;
    (function (DataBank) {
        let PortSnapshot;
        (function (PortSnapshot) {
            PortSnapshot.Id = zod_1.default.string().brand("Execution.Recording.PortSnapshot.Id");
            // Deterministic — always uowId:portId, no need to pass around separately
            PortSnapshot.formatId = (uowId, portId) => `${uowId}:${portId}`;
            PortSnapshot.Schema = zod_1.default.object({
                id: PortSnapshot.Id,
                portId: Port_1.Port.Id,
                value: Projection_1.Projection.Schema,
            });
        })(PortSnapshot = DataBank.PortSnapshot || (DataBank.PortSnapshot = {}));
        DataBank.Schema = zod_1.default.object({
            snapshots: zod_1.default.record(PortSnapshot.Id, PortSnapshot.Schema).default({}),
        });
    })(DataBank = Recording.DataBank || (Recording.DataBank = {}));
    // ─── Metric ──────────────────────────────────────────────────────────
    // Node-defined per-UoW measurement. Renderer formats by `type`; `value`
    // is the raw number/string. Nodes return `Record<string, Metric>` from
    // `onRecordMetrics` — the key is the stable programmatic identifier,
    // displayName is purely cosmetic.
    let Metric;
    (function (Metric) {
        Metric.Type = zod_1.default.enum([
            "number",
            "string",
            "duration_ms",
            "currency_usd",
            "tokens",
        ]);
        Metric.Schema = zod_1.default.object({
            displayName: zod_1.default.string(),
            value: zod_1.default.union([zod_1.default.string(), zod_1.default.number()]),
            type: Metric.Type,
        });
    })(Metric = Recording.Metric || (Recording.Metric = {}));
    // ─── UnitOfWork ──────────────────────────────────────────────────────
    // One per node execution. Cyclic nodes produce multiple UoWs on the
    // same track. Times are ms relative to origin (0 = execution start).
    let UnitOfWork;
    (function (UnitOfWork) {
        UnitOfWork.Id = zod_1.default.string().brand("Execution.Recording.UnitOfWork.Id");
        UnitOfWork.createId = (nodeId) => `${nodeId}:${crypto.randomUUID().slice(0, 8)}`;
        UnitOfWork.Status = zod_1.default.enum(["running", "completed", "failed"]);
        UnitOfWork.Schema = zod_1.default.object({
            id: UnitOfWork.Id,
            trackId: Workflow_1.Workflow.Node.Id,
            status: UnitOfWork.Status,
            startedAt: zod_1.default.number(), // ms from origin
            duration: zod_1.default.number().optional(), // ms; undefined while running
            inputSnapshot: zod_1.default.record(Port_1.Port.Input.Id, DataBank.PortSnapshot.Id).default({}),
            outputSnapshot: zod_1.default.record(Port_1.Port.Output.Id, DataBank.PortSnapshot.Id).default({}),
            fieldSnapshot: zod_1.default.record(zod_1.default.string(), zod_1.default.unknown()).optional(),
            metrics: zod_1.default.record(zod_1.default.string(), Metric.Schema).optional(),
        });
    })(UnitOfWork = Recording.UnitOfWork || (Recording.UnitOfWork = {}));
    // ─── Track ───────────────────────────────────────────────────────────
    // One per node. unitIds is append-only in execution order.
    let Track;
    (function (Track) {
        Track.Id = Workflow_1.Workflow.Node.Id;
        Track.Schema = zod_1.default.object({
            id: Track.Id,
            unitIds: zod_1.default.array(UnitOfWork.Id).default([]),
        });
    })(Track = Recording.Track || (Recording.Track = {}));
    // ─── Relation ────────────────────────────────────────────────────────
    // Connects two UoWs via a workflow edge.
    // "signal"      — source directly triggered target this cycle  (solid arrow)
    // "dataRemnant" — source ran in a prior cycle; target read its stale output (dashed arrow)
    let Relation;
    (function (Relation) {
        Relation.Id = zod_1.default.string().brand("Execution.Recording.Relation.Id");
        Relation.formatId = (source, edgeId, target) => `${source}:${edgeId}:${target}`;
        Relation.Schema = zod_1.default.object({
            id: Relation.Id,
            source: UnitOfWork.Id,
            target: UnitOfWork.Id,
            edge: Workflow_1.Workflow.Edge.Id,
            type: zod_1.default.enum(["signal", "dataRemnant"]),
            dataSnapshotId: DataBank.PortSnapshot.Id,
        });
    })(Relation = Recording.Relation || (Recording.Relation = {}));
    // ─── Schema ──────────────────────────────────────────────────────────
    // The embedded payload. id/executionId/workflowId/createdAt are NOT
    // here — they're on the parent Execution row.
    Recording.Schema = zod_1.default.object({
        workflowDataSnapshot: Workflow_1.Workflow.Data.Schema, // workflow state at execution time;
        // insulates the timeline from subsequent edits
        tracks: zod_1.default.record(Track.Id, Track.Schema).default({}),
        units: zod_1.default.record(UnitOfWork.Id, UnitOfWork.Schema).default({}),
        relations: zod_1.default.record(Relation.Id, Relation.Schema).default({}),
        dataBank: DataBank.Schema.default({ snapshots: {} }),
    });
    // ─── Timeline UI constants ───────────────────────────────────────────
    // Pixel geometry and formatting helpers for the timeline viewer.
    let Timeline;
    (function (Timeline) {
        Timeline.UOW_PORT_HEIGHT = 20; // px — height of one port sub-row inside a UoW block
        Timeline.TRACK_PADDING_Y = 3; // px — vertical inset above/below the UoW block within its track row
        Timeline.TRACK_LABEL_W = 100; // px — width of the track label column
        Timeline.RULER_H = 28; // px — height of the time ruler header
        Timeline.MIN_BLOCK_W = 6; // px — minimum rendered width of a completed UoW block
        Timeline.RUNNING_BLOCK_W = 32; // px — fixed width used while a UoW is still running
        function tickIntervalMs(pixelsPerMs) {
            if (pixelsPerMs >= 2)
                return 10;
            if (pixelsPerMs >= 0.5)
                return 100;
            if (pixelsPerMs >= 0.1)
                return 500;
            return 1000;
        }
        Timeline.tickIntervalMs = tickIntervalMs;
        function formatMs(ms) {
            if (ms >= 1000)
                return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`;
            return `${ms}ms`;
        }
        Timeline.formatMs = formatMs;
    })(Timeline = Recording.Timeline || (Recording.Timeline = {}));
})(Recording || (exports.Recording = Recording = {}));
