"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumanReview = void 0;
const zod_1 = require("zod");
const Field_1 = require("./Foundations/Field");
const Consultation_1 = require("./Consultation");
// Human-in-the-loop gate, bolted onto Consultation. The node fires, consultationAPI parks it
// and mirrors the request onto the session, the workbench renders a card, and the human's
// Answer travels back on Consultation.Signal.Answer to resume the run.
//
// No events, signals or API of its own — Consultation owns all three.
var HumanReview;
(function (HumanReview) {
    HumanReview.Id = Consultation_1.Consultation.Id.brand("HumanReview.Id");
    // Variant tags are namespaced: Consultation.Variant is an open registry shared with every
    // other consulting node, so a bare "confirm" would be free to collide.
    HumanReview.Variant = {
        Confirm: Consultation_1.Consultation.variant("human-review:confirm"),
        Choice: Consultation_1.Consultation.variant("human-review:choice"),
        Form: Consultation_1.Consultation.variant("human-review:form"),
    };
    // ─── Request ────────────────────────────────────────────────────────────
    // Node → human.
    let Request;
    (function (Request) {
        const Base = Consultation_1.Consultation.Request.extend({
            id: HumanReview.Id,
            title: zod_1.z.string().optional(),
            message: zod_1.z.string().optional(),
            timeoutMs: zod_1.z.number().default(60_000),
        });
        // Approve / Reject → 2 ports (approved | rejected)
        Request.Confirm = Base.extend({
            variant: zod_1.z.literal(HumanReview.Variant.Confirm),
            approveLabel: zod_1.z.string().default("Approve"),
            rejectLabel: zod_1.z.string().default("Reject"),
        });
        // Pick one option, or many if multiple (+ optional custom) + Send → 1 Data port
        Request.Choice = Base.extend({
            variant: zod_1.z.literal(HumanReview.Variant.Choice),
            options: zod_1.z.array(zod_1.z.object({ label: zod_1.z.string(), value: zod_1.z.string() })),
            multiple: zod_1.z.boolean().default(false),
            allowCustom: zod_1.z.boolean().default(false),
            sendLabel: zod_1.z.string().default("Send"),
        });
        // Form → 1 Data port. Reuses Foundations/Field so the existing FieldRenderer drives it.
        Request.Form = Base.extend({
            variant: zod_1.z.literal(HumanReview.Variant.Form),
            fields: zod_1.z.array(Field_1.Field.Schema),
            sendLabel: zod_1.z.string().default("Send"),
        });
        Request.Schema = zod_1.z.discriminatedUnion("variant", [Request.Confirm, Request.Choice, Request.Form]);
    })(Request = HumanReview.Request || (HumanReview.Request = {}));
    // ─── Answer ─────────────────────────────────────────────────────────────
    // Human → node. Resumes the parked run.
    let Answer;
    (function (Answer) {
        const Base = Consultation_1.Consultation.Answer.extend({
            requestId: HumanReview.Id,
        });
        // approved drives the approved/rejected port split
        Answer.Confirm = Base.extend({
            variant: zod_1.z.literal(HumanReview.Variant.Confirm),
            approved: zod_1.z.boolean(),
        });
        // chosen (or custom) values → Data port. Single choice = one-element array.
        Answer.Choice = Base.extend({
            variant: zod_1.z.literal(HumanReview.Variant.Choice),
            values: zod_1.z.array(zod_1.z.string()),
        });
        // collected field values → Data port
        Answer.Form = Base.extend({
            variant: zod_1.z.literal(HumanReview.Variant.Form),
            values: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
        });
        Answer.Schema = zod_1.z.discriminatedUnion("variant", [Answer.Confirm, Answer.Choice, Answer.Form]);
    })(Answer = HumanReview.Answer || (HumanReview.Answer = {}));
})(HumanReview || (exports.HumanReview = HumanReview = {}));
