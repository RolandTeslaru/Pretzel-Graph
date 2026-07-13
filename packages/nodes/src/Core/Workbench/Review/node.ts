import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";
import { HumanReview } from "@pretzel-graph/shared/domain";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    // Only the chosen branch propagates (confirm → approved | rejected).
    protected override readonly PROPAGATION_STRATEGY = RuntimeNode.PropagationStrategy.ROUTER;

    
    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        const execId  = this.context.executionId;
        const request = HumanReview.Request.Schema.parse(this.buildRequest());

        // Surface the dialog, park until the human responds (or the execution aborts / times out).
        const { resolution } = await this.context.realtimeAPI.emitAndAwaitSignal(
            HumanReview.Event.Sent.Schema.parse({
                channel: HumanReview.Event.getChannel(execId),
                type: "human-review:sent",
                request,
            }),
            HumanReview.Signal.HumanResponded.getChannel(execId, request.id),
            HumanReview.Signal.HumanResponded.Schema,
            request.timeoutMs,
        );

        // Confirm the workbench can close the dialog.
        this.context.realtimeAPI.emit(HumanReview.Event.Resolved.Schema.parse({
            channel: HumanReview.Event.getChannel(execId),
            type: "human-review:resolved",
            requestId: request.id,
            resolution,
        }));

        return this.mapResolution(resolution, incoming);
    }

    // reconcile-added fields aren't in InferFieldValues, so the variant config is read via cast.
    private buildRequest() {
        const f = this.fieldValues as Record<string, any>;
        const base = {
            id:          crypto.randomUUID() as HumanReview.Request.Id,
            nodeId:      this.nodeId,
            executionId: this.context.executionId,
            title:       f.title || undefined,
            message:     f.message || undefined,
            createdAt:   Date.now(),
            timeoutMs:   f.timeoutMs,
        };

        switch (f.variant) {
            case "choice":
                return { ...base, variant: "choice", options: f.options ?? [], multiple: !!f.multiple, allowCustom: !!f.allowCustom };
            case "form":
                return { ...base, variant: "form", fields: f.formFields ?? [] };
            case "confirm":
            default:
                return { ...base, variant: "confirm", approveLabel: f.approveLabel, rejectLabel: f.rejectLabel };
        }
    }

    // Map the human's answer onto the (reconcile-driven) output ports. The variant ports
    // aren't in the static InferOutputs, so the result is cast.
    private mapResolution(
        resolution: HumanReview.Resolution,
        incoming: InferIncoming<typeof Blueprint>,
    ): Partial<InferOutputs<typeof Blueprint>> {
        let result: Record<string, unknown>;
        switch (resolution.variant) {
            case "confirm":
                result = resolution.approved
                    ? { approved: incoming.input ?? null }
                    : { rejected: incoming.input ?? null };
                break;
            case "choice":
                result = { value: resolution.values };
                break;
            case "form":
                result = { values: resolution.values };
                break;
        }
        return result as Partial<InferOutputs<typeof Blueprint>>;
    }
}
