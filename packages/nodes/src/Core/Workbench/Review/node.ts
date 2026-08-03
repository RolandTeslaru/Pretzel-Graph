import {
    InferIncoming,
    InferOutputs,
    RegisterNode,
    RuntimeNode,
} from "@pretzel-graph/node-sdk";
import { HumanReview } from "@pretzel-graph/shared/domain";

import { Blueprint } from "./blueprint";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ) {
        const fields = this.fieldValues;
        const baseRequest = {
            id:          crypto.randomUUID() as HumanReview.Request.Id,
            nodeId:      this.nodeId,
            executionId: this.context.executionId,
            title:       fields.title || undefined,
            message:     fields.message || undefined,
            createdAt:   Date.now(),
            timeoutMs:   fields.timeoutMs,
        };

        const request = HumanReview.Request.Schema.parse(
            fields.variant === "confirm"
                ? {
                    ...baseRequest,
                    variant:      fields.variant,
                    approveLabel: fields.approveLabel,
                    rejectLabel:  fields.rejectLabel,
                }
                : fields.variant === "choice"
                    ? {
                        ...baseRequest,
                        variant:     fields.variant,
                        options:     fields.options,
                        multiple:    fields.multiple,
                        allowCustom: fields.allowCustom,
                    }
                    : {
                        ...baseRequest,
                        variant: fields.variant,
                        fields:  fields.formFields,
                    },
        );

        const execId = this.context.executionId;

        // Surface the dialog, then park until the human responds or the wait times out.
        const { resolution } = await this.context.realtimeAPI.emitAndAwaitSignal(
            HumanReview.Event.Sent.Schema.parse({
                channel: HumanReview.Event.getChannel(execId),
                type:    "human-review:sent",
                request,
            }),
            HumanReview.Signal.HumanResponded.getChannel(execId, request.id),
            HumanReview.Signal.HumanResponded.Schema,
            request.timeoutMs,
        );

        this.context.realtimeAPI.emit(HumanReview.Event.Resolved.Schema.parse({
            channel:   HumanReview.Event.getChannel(execId),
            type:      "human-review:resolved",
            requestId: request.id,
            resolution,
        }));

        const mismatchedVariant = () => new Error(
            `Workbench Review: expected a ${fields.variant} resolution, received ${resolution.variant}.`,
        );

        switch (resolution.variant) {
            case "confirm":
                if (fields.variant !== "confirm")
                    throw mismatchedVariant();

                return (
                    resolution.approved
                        ? { approved: incoming.input ?? null }
                        : { rejected: incoming.input ?? null }
                ) satisfies Partial<InferOutputs<typeof Blueprint, typeof fields>>;

            case "choice":
                if (fields.variant !== "choice")
                    throw mismatchedVariant();

                return {
                    value: resolution.values,
                } satisfies Partial<InferOutputs<typeof Blueprint, typeof fields>>;

            case "form":
                if (fields.variant !== "form")
                    throw mismatchedVariant();

                return {
                    values: resolution.values,
                } satisfies Partial<InferOutputs<typeof Blueprint, typeof fields>>;
        }
    }
}
