import { Blueprint } from "./blueprint";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import type { Execution, Foundations } from "@pretzel-graph/shared/domain";

export class Node extends RuntimeNode<typeof Blueprint> {

    public injectedData: any = null;

    protected override onIgniter(igniter: Execution.Igniter): void {
        if (!igniter.inputs)
            return;

        const portId = this.fieldValues.exposed_port_id as Foundations.Port.Input.Id;

        this.injectedData = igniter.inputs[portId] ?? null;
    }

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        // null = "exposed but nothing injected" — a settled-empty value the data
        // gate treats as arrived. Never emit undefined (that means "still waiting").
        return {
            output: this.injectedData ?? null,
        };
    }
}
