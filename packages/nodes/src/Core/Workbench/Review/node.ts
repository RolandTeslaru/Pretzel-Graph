import {
    InferIncoming,
    InferOutputs,
    RegisterNode,
    RuntimeNode,
} from "@pretzel-graph/node-sdk";
import z from "zod";
import { HumanReview } from "@pretzel-graph/shared/domain";

import { Blueprint } from "./blueprint";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ) {
        const fields = this.fieldValues;

        // consultationAPI stamps id and startedAt, so the node builds everything else.
        const base = {
            nodeId:    this.nodeId,
            title:     fields.title || undefined,
            message:   fields.message || undefined,
            timeoutMs: fields.timeoutMs,
        };

        const consult = this.context.consultationAPI.consult;

        // One branch per variant, each awaiting only the answer it can use. An answer
        // of the wrong shape fails in consult's parse rather than reaching the ports.
        switch (fields.variant) {

            case "confirm": {
                const answer = await consult(
                    HumanReview.Request.Confirm,
                    {
                        ...base,
                        variant:      HumanReview.Variant.Confirm,
                        approveLabel: fields.approveLabel,
                        rejectLabel:  fields.rejectLabel,
                    },
                    HumanReview.Answer.Confirm,
                );

                return (
                    answer.approved
                        ? { approved: incoming.input ?? null }
                        : { rejected: incoming.input ?? null }
                ) satisfies Partial<InferOutputs<typeof Blueprint, typeof fields>>;
            }

            case "choice": {
                const answer = await consult(
                    HumanReview.Request.Choice,
                    {
                        ...base,
                        variant:     HumanReview.Variant.Choice,
                        // Json-backed blueprint field — consult parses it on the way in.
                        options:     fields.options as z.input<typeof HumanReview.Request.Choice>["options"],
                        multiple:    fields.multiple,
                        allowCustom: fields.allowCustom,
                    },
                    HumanReview.Answer.Choice,
                );

                return {
                    value: answer.values,
                } satisfies Partial<InferOutputs<typeof Blueprint, typeof fields>>;
            }

            case "form": {
                const answer = await consult(
                    HumanReview.Request.Form,
                    {
                        ...base,
                        variant: HumanReview.Variant.Form,
                        // Json-backed blueprint field — consult parses it on the way in.
                        fields:  fields.formFields as z.input<typeof HumanReview.Request.Form>["fields"],
                    },
                    HumanReview.Answer.Form,
                );

                return {
                    values: answer.values,
                } satisfies Partial<InferOutputs<typeof Blueprint, typeof fields>>;
            }
        }
    }
}
