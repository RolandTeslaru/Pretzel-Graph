"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const domain_1 = require("../../../../../shared/domain");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(incoming) {
        const fields = this.fieldValues;
        // consultationAPI stamps id and startedAt, so the node builds everything else.
        const base = {
            nodeId: this.nodeId,
            title: fields.title || undefined,
            message: fields.message || undefined,
            timeoutMs: fields.timeoutMs,
        };
        const consult = this.context.consultationAPI.consult;
        // One branch per variant, each awaiting only the answer it can use. An answer
        // of the wrong shape fails in consult's parse rather than reaching the ports.
        switch (fields.variant) {
            case "confirm": {
                const answer = await consult({
                    requestSchema: domain_1.HumanReview.Request.Confirm,
                    answerSchema: domain_1.HumanReview.Answer.Confirm,
                    request: {
                        ...base,
                        variant: domain_1.HumanReview.Variant.Confirm,
                        approveLabel: fields.approveLabel,
                        rejectLabel: fields.rejectLabel,
                    },
                });
                return (answer.approved
                    ? { approved: incoming.input ?? null }
                    : { rejected: incoming.input ?? null });
            }
            case "choice": {
                const answer = await consult({
                    requestSchema: domain_1.HumanReview.Request.Choice,
                    answerSchema: domain_1.HumanReview.Answer.Choice,
                    request: {
                        ...base,
                        variant: domain_1.HumanReview.Variant.Choice,
                        // Json-backed blueprint field — consult parses it on the way in.
                        options: fields.options,
                        multiple: fields.multiple,
                        allowCustom: fields.allowCustom,
                    },
                });
                return {
                    value: answer.values,
                };
            }
            case "form": {
                const answer = await consult({
                    requestSchema: domain_1.HumanReview.Request.Form,
                    answerSchema: domain_1.HumanReview.Answer.Form,
                    request: {
                        ...base,
                        variant: domain_1.HumanReview.Variant.Form,
                        // Json-backed blueprint field — consult parses it on the way in.
                        fields: fields.formFields,
                    },
                });
                return {
                    values: answer.values,
                };
            }
        }
    }
}
exports.Node = Node;
