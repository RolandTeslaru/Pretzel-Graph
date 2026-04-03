import { Foundations } from "@vx-agent-editor/shared/domain";
import { InferFields } from "src/types";
import { FieldBuilder } from "src/nodes/builders";
import { cloneDeep } from "lodash";

export const reconcile = (
    blueprint: Foundations.Blueprint,
    changedFieldId: keyof InferFields<Foundations.Blueprint>,
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
