"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Igniter = void 0;
const zod_1 = __importDefault(require("zod"));
const Workflow_1 = require("../Workflow");
const zod_utils_1 = require("../zod-utils");
const Chat_1 = require("../Chat");
// ─── Igniter ──────────────────────────────────────────────────────────────
// What kicked off the execution. Replaces the old Trigger + Igniter split.
var Igniter;
(function (Igniter) {
    Igniter.Base = zod_1.default.object({
        record: zod_1.default.boolean().optional(),
        debug: zod_1.default.boolean().optional(),
        chat_id: Chat_1.Chat.Id.optional(),
    });
    Igniter.WorkbenchManual = Igniter.Base.extend({
        variant: zod_1.default.literal("workbench_manual"),
    });
    // Partial "run to here" from the editor. Executes only `targetNodeId` and the
    // minimal upstream sub-chain missing from the seeded session; cached upstreams
    // are replayed (fired without re-running). See worker compiler/partial.ts.
    Igniter.WorkbenchStep = Igniter.Base.extend({
        variant: zod_1.default.literal("workbench_step"),
        targetNodeId: Workflow_1.Workflow.Node.Id,
    });
    // Run from the editor with one igniteable node elected. Igniteable nodes never
    // self-start, so a run that wants one has to name it; that node becomes the
    // start node. Carries no payload — whatever the node waits on arrives out of
    // band, and nothing here knows what kind of node it is.
    Igniter.WorkbenchIgniter = Igniter.Base.extend({
        variant: zod_1.default.literal("workbench_igniter"),
        nodeId: Workflow_1.Workflow.Node.Id,
    });
    Igniter.SubWorkflow = Igniter.Base.extend({
        variant: zod_1.default.literal("sub_workflow"),
        parentNodeId: Workflow_1.Workflow.Node.Id,
        subWorkflowPath: zod_1.default.array(Workflow_1.Workflow.Id),
    });
    Igniter.ChatMessage = Igniter.Base.extend({
        variant: zod_1.default.literal("chat_message"),
        message: Chat_1.Chat.Message.Schema,
    });
    Igniter.Webhook = Igniter.Base.extend({
        variant: zod_1.default.literal("webhook"),
        nodeId: Workflow_1.Workflow.Node.Id,
        payload: zod_1.default.object({
            method: zod_1.default.string(),
            path: zod_1.default.string(),
            headers: zod_1.default.record(zod_1.default.string(), zod_1.default.unknown()),
            query: zod_1.default.record(zod_1.default.string(), zod_1.default.unknown()),
            body: zod_1.default.unknown(),
        }),
    });
    Igniter.Scheduled = Igniter.Base.extend({
        variant: zod_1.default.literal("scheduled"),
        scheduleId: zod_1.default.string().optional(),
        scheduledAt: zod_utils_1.supabaseTimestamp,
    });
    // Added by the api-keys spec.
    Igniter.Sdk = Igniter.Base.extend({
        variant: zod_1.default.literal("sdk"),
        inputs: zod_1.default.record(zod_1.default.string(), zod_1.default.unknown()).optional(),
    });
    Igniter.Schema = zod_1.default.discriminatedUnion("variant", [
        Igniter.WorkbenchManual,
        Igniter.WorkbenchStep,
        Igniter.WorkbenchIgniter,
        Igniter.SubWorkflow,
        Igniter.ChatMessage,
        Igniter.Webhook,
        Igniter.Scheduled,
        Igniter.Sdk,
    ]);
})(Igniter || (exports.Igniter = Igniter = {}));
