import { Foundations } from "@vx-agent-editor/shared/domain";
import { FieldBuilder } from "./field";
export { FieldBuilder } from "./field"
export { InputBuilder } from "./input"
export { OutputBuilder } from "./output"


// ============================================
// BLUEPRINT BUILDER
// ============================================


// Explicit return type to avoid "cannot be named without reference to zod internals" error
type DefineBlueprintReturn<
    TId extends string,
    TFields extends readonly Foundations.Field[],
    TInputs extends readonly Foundations.Port.Input[],
    TOutputs extends readonly Foundations.Port.Output[],
    TToolCompatible extends boolean = false
> = {
    readonly id: TId & Foundations.Blueprint.Id;
    readonly displayName: string;
    readonly description: string;
    readonly icon: string;
    readonly accent?: string;
    readonly fields: TToolCompatible extends true ? readonly [...TFields, typeof hiddenToolField] : TFields;
    readonly inputs: TInputs;
    readonly outputs: TOutputs;
    readonly toolCompatible: TToolCompatible;
}

const hiddenToolField = FieldBuilder.Boolean({
    id: "isConvertedToTool",
    displayName: "Tool Mode",
    hidden: true,
    reconcile: true,
    initialValue: false,
});

export function defineBlueprint<
    const TId extends string,
    const TFields extends readonly Foundations.Field[],
    const TInputs extends readonly Foundations.Port.Input[],
    const TOutputs extends readonly Foundations.Port.Output[],
    const TToolCompatible extends boolean = false
>(config: {
    id: TId;
    displayName: string;
    description: string;
    icon: string;
    accent?: string;
    fields: TFields;
    inputs: TInputs;
    outputs: TOutputs;
    toolCompatible?: TToolCompatible
}): DefineBlueprintReturn<TId, TFields, TInputs, TOutputs, TToolCompatible> {
    const fields = (config.toolCompatible
        ? [...config.fields, hiddenToolField]
        : config.fields) as DefineBlueprintReturn<TId, TFields, TInputs, TOutputs, TToolCompatible>["fields"];

    return {
        id: config.id as TId & Foundations.Blueprint.Id,
        displayName: config.displayName,
        description: config.description,
        icon: config.icon,
        accent: config.accent,
        fields,
        inputs: config.inputs,
        outputs: config.outputs,
        toolCompatible: (config.toolCompatible ?? false) as TToolCompatible,
    };
}