"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Base = exports.getChannel = exports.Channel = void 0;
exports.defineEventFactory = defineEventFactory;
const Realtime_1 = require("../Realtime");
const ids_1 = require("../Workflow/ids");
const ids_2 = require("./ids");
// ─── Outbound base ────────────────────────────────────────────────────────
// Every execution-scoped domain extends `Base` so they all travel on the one
// outbound channel, execution:<executionId>.
//
// Split out of event.ts, which reaches Consultation through session.ts — so the
// domains extending this cannot import event.ts without closing a cycle. Kept a
// leaf: zod, Realtime, and the two id modules only. Note ../Workflow/ids rather
// than the Workflow barrel, which reaches back here through Workflow/node.ts.
exports.Channel = Realtime_1.Realtime.Channel.brand("ExecutionChannel");
const getChannel = (executionId) => `execution:${executionId}`;
exports.getChannel = getChannel;
exports.Base = Realtime_1.Realtime.Event.Base.extend({
    channel: exports.Channel,
    executionId: ids_2.ExecutionId,
    workflowId: ids_1.WorkflowId,
});
/**
 * Builds a namespace's `create` from its union, so each domain owns a typed factory
 * without a hand-written copy of the OfType/Rest/RestArg block.
 *
 * The schema is the inference source only — nothing is parsed. The result is addressless
 * by construction, so there is no complete member here to validate.
 */
function defineEventFactory(_schema) {
    return function create(type, ...[rest]) {
        return { ...rest, type };
    };
}
