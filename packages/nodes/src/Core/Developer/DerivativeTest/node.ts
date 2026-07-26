import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

@RegisterNode(Blueprint.id)
export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(incoming: InferIncoming<typeof Blueprint>) {

        const fields      = this.fieldValues;
        const passthrough = incoming.in;

        // No casts: narrowing `shape` reveals that branch's fields *and* the outputs it owes.
        // `passthrough` is required on every arm because the base declares it.
        if (fields.shape === "text") {
            // `suffix` is declared by the shape==text branch, so it only exists once narrowed.
            const input = this.incomingFor(fields, incoming);
            const text  = `${fields.text}${input.suffix ?? ""}`;

            return {
                passthrough,
                value:  text,
                length: text.length,
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }

        if (fields.shape === "number") {

            if (fields.rounding === "fixed")
                return {
                    passthrough,
                    value:     Number(fields.amount.toFixed(fields.decimals)),
                    precision: fields.decimals,
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            return {
                passthrough,
                value: fields.amount,
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }

        // shape==none matches nothing, so only the base output is owed.
        return { passthrough } satisfies InferOutputs<typeof Blueprint, typeof fields>;
    }
}
