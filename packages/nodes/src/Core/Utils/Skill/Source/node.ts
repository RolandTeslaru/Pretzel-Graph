import { RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";

import { Blueprint } from "./blueprint";

export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(
        _incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        const ref = this.fieldValues.skill;

        if (ref?.kind !== "skill")
            throw new Error("No skill selected");

        return { skill: ref };
    }
}
