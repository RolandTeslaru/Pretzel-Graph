import { Foundations } from "@pretzel-graph/shared/domain";
import { InferFieldValues, FieldBuilder } from "@pretzel-graph/node-sdk";
import { cloneDeep } from "lodash";

/**
 * Mutates the node's field schema when `mode` changes:
 *   - stop  → no extra field
 *   - error → reveals `message`
 *
 * NOTE: `message` is NOT in `InferFieldValues<typeof Blueprint>` (derived from the static
 * base blueprint), so `onRun` reads it via a cast.
 */
export const reconcile = (
    blueprint: Foundations.Blueprint,
    changedFieldId: keyof InferFieldValues<Foundations.Blueprint>,
    newValue: Foundations.Field.Value,
): Foundations.Blueprint => {
    const next = cloneDeep(blueprint);
    if (changedFieldId !== "mode") return next;

    const fields = new Map(next.fields.map(f => [f.id, f]));

    if (newValue === "error") {
        fields.set("message" as Foundations.Field.Id, FieldBuilder.String({
            id: "message",
            displayName: "Error Message",
            multiline: true,
            initialValue: "",
            placeholder: "Workflow terminated.",
        }) as unknown as Foundations.Field);
    } else {
        fields.delete("message" as Foundations.Field.Id);
    }

    // @ts-expect-error rebuild the readonly fields tuple from the working map
    next.fields = [...fields.values()];
    return next;
};
