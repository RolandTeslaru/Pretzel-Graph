import { Foundations } from "@vx-agent-editor/shared/domain";
import { Blueprint } from "./blueprint";
import { InferFields } from "src/types";
import { FieldBuilder } from "src/nodes/builders";
import { cloneDeep } from "lodash";

export const reconcile = (
    changedFieldId: keyof InferFields<typeof Blueprint>,
    newValue: Foundations.Field.Value,
): Foundations.Blueprint => {

    const newBlueprint = cloneDeep(Blueprint);
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
    }

    // @ts-expect-error
    newBlueprint.fields = [...fields.values()] as typeof newBlueprint.fields;
    return newBlueprint;
};
