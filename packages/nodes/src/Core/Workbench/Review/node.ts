import {
    InferIncoming,
    InferOutputs,
    RegisterNode,
    RuntimeNode,
} from "@pretzel-graph/node-sdk";
import { HumanReview } from "@pretzel-graph/shared/domain";

import { Blueprint } from "./blueprint";

/** consultationAPI stamps these two, so the request is parsed without them. */
const STAMPED = { id: true, startedAt: true } as const;

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

        // One branch per variant, each awaiting only the resolution it can use. A resolution
        // of the wrong shape fails in consult's parse rather than reaching the ports.
        switch (fields.variant) {

            case "confirm": {
                const request = HumanReview.Request.Confirm.omit(STAMPED).parse({
                    ...base,
                    variant:      HumanReview.Variant.Confirm,
                    approveLabel: fields.approveLabel,
                    rejectLabel:  fields.rejectLabel,
                }) 

                const resolution = await consult(HumanReview.Resolution.Confirm, request);

                return (
                    resolution.approved
                        ? { approved: incoming.input ?? null }
                        : { rejected: incoming.input ?? null }
                ) satisfies Partial<InferOutputs<typeof Blueprint, typeof fields>>;
            }

            case "choice": {
                const request = HumanReview.Request.Choice.omit(STAMPED).parse({
                    ...base,
                    variant:     HumanReview.Variant.Choice,
                    options:     fields.options,
                    multiple:    fields.multiple,
                    allowCustom: fields.allowCustom,
                })

                const resolution = await consult(HumanReview.Resolution.Choice, request);

                return {
                    value: resolution.values,
                } satisfies Partial<InferOutputs<typeof Blueprint, typeof fields>>;
            }

            case "form": {
                const request = HumanReview.Request.Form.omit(STAMPED).parse({
                    ...base,
                    variant: HumanReview.Variant.Form,
                    fields:  fields.formFields,
                })

                const resolution = await consult(HumanReview.Resolution.Form, request);

                return {
                    values: resolution.values,
                } satisfies Partial<InferOutputs<typeof Blueprint, typeof fields>>;
            }
        }
    }
}
