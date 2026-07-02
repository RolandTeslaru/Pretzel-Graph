import { Foundations } from "@pretzel-graph/shared/domain";
import { InferFieldValues } from "@pretzel-graph/node-sdk";
import { FieldBuilder } from "@pretzel-graph/node-sdk";
import { cloneDeep } from "lodash";

export const reconcile = (
    blueprint: Foundations.Blueprint,
    changedFieldId: keyof InferFieldValues<Foundations.Blueprint>,
    newValue: Foundations.Field.Value,
): Foundations.Blueprint => {

    const newBlueprint = cloneDeep(blueprint);
    const fields = new Map(newBlueprint.fields.map(f => [f.id, f]));

    if (changedFieldId === "role") {
        if (newValue === "Tool") {
            fields.set("toolCallId" as any, FieldBuilder.String({
                id: "toolCallId",
                displayName: "Tool Call ID",
                initialValue: "",
                placeholder: "Required for Tool messages",
            }) as any);
        }
        else if (newValue === "System" || newValue === "Human" || newValue === "Assistant") {
            fields.delete("toolCallId" as any);
        }
    }
    // @ts-expect-error
    newBlueprint.fields = [...fields.values()] as typeof newBlueprint.fields;
    return newBlueprint;
};
