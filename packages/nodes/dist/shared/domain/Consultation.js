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
exports.Consultation = void 0;
const zod_1 = __importDefault(require("zod"));
const ids_1 = require("./Workflow/ids");
const signal_1 = require("./Execution/signal");
const ExecutionEvent = __importStar(require("./Execution/event-base"));
// The workflow asking the user for something and parking until it gets an answer.
// `type` is an open brand rather than a closed union, so a node can introduce a new
// kind of consultation without editing this file — extend Request/Resolution in the
// owning namespace and register a renderer on the frontend.
var Consultation;
(function (Consultation) {
    Consultation.Id = zod_1.default.uuid().brand("Consultation.Id");
    Consultation.Variant = zod_1.default.string().brand("Consultation.Variant");
    /**
     * Brands a variant tag while KEEPING its literal type. A plain `as Variant` widens the
     * tag to the branded string, and an extending schema then can't discriminate its own
     * union on it — every member narrows to `never`.
     */
    Consultation.variant = (tag) => tag;
    /**
     * Loose, not strict: this base travels as the declared type of `Signal.Answer.answer`
     * and `Session.pending_consultations`, so a strict object would silently strip whatever the
     * extending domain added — the very fields that make the consultation meaningful. Extras
     * survive the base-typed hop and are validated by the variant schema at each end.
     */
    Consultation.Request = zod_1.default.looseObject({
        id: Consultation.Id,
        variant: Consultation.Variant,
        // Which node is asking — drives attribution in the workbench.
        nodeId: ids_1.NodeId,
        // Epoch ms, stamped by consultationAPI. With timeoutMs it gives the absolute
        // deadline, so a card rebuilt after a page rejoin resumes mid-countdown.
        startedAt: zod_1.default.number(),
        timeoutMs: zod_1.default.number(),
    });
    /** The message a human or external caller sends back. Loose for the same reason as
     *  Request — see the note there. */
    Consultation.Answer = zod_1.default.looseObject({
        requestId: Consultation.Id,
        variant: Consultation.Variant
    });
    // Travels on the execution's own outbound channel — the union is Consultation's,
    // the channel is shared. See Execution/event-base.
    let Event;
    (function (Event) {
        // The consultation reached its terminal state: the answer parsed, the node un-parked.
        // Purely an acknowledgement — the card is already gone via the session patch that
        // clears pending_consultations.
        Event.Resolved = ExecutionEvent.Base.extend({
            type: zod_1.default.literal("consultation:resolved"),
            consultationId: Consultation.Id,
        });
        Event.Schema = zod_1.default.discriminatedUnion("type", [Event.Resolved]);
        Event.create = ExecutionEvent.defineEventFactory(Event.Schema);
    })(Event = Consultation.Event || (Consultation.Event = {}));
    // Inbound on the execution's one signal channel. consultationId is the correlation
    // key, matched in-process by the parked node — it is not part of any channel name,
    // because only executionId is an ownership boundary and a channel suffix authorizes
    // nothing.
    let Signal;
    (function (Signal) {
        const Base = signal_1.Signal.Base.extend({
            consultationId: Consultation.Id
        });
        Signal.Answer = Base.extend({
            type: zod_1.default.literal("consultation:answer"),
            answer: Consultation.Answer
        });
        Signal.Schema = zod_1.default.discriminatedUnion("type", [Signal.Answer]);
    })(Signal = Consultation.Signal || (Consultation.Signal = {}));
    // ─── API ────────────────────────────────────────────────────────────────
    // Frontend → backend HTTP. The browser never touches Redis; the authed route below
    // verifies execution ownership then publishes the Answer signal upstream.
    let API;
    (function (API) {
        // The upstream user→engine message. Event.Resolved is the DOWNSTREAM confirmation the
        // worker emits once it has consumed this and un-parked.
        // executionId is the authorization boundary, so it travels in the path and the route's
        // scope guard proves ownership before the handler runs. Strict so a stale client still
        // sending it in the body is rejected outright rather than silently stripped.
        let Answer;
        (function (Answer) {
            Answer.Request = zod_1.default.strictObject({
                consultationId: Consultation.Id,
                answer: Consultation.Answer,
            });
            Answer.Response = zod_1.default.object({ success: zod_1.default.boolean() });
        })(Answer = API.Answer || (API.Answer = {}));
        async function answer(api, executionId, req) {
            const { data } = await api.post(`/api/consultation/${executionId}/answer`, req);
            return data;
        }
        API.answer = answer;
    })(API = Consultation.API || (Consultation.API = {}));
})(Consultation || (exports.Consultation = Consultation = {}));
