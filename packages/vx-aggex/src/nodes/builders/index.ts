import { Foundations } from "@vx-agent-editor/shared/domain";
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
    TOutputs extends readonly Foundations.Port.Output[]
> = {
    readonly id: TId & Foundations.Blueprint.Id;
    readonly displayName: string;
    readonly description: string;
    readonly icon: string;
    readonly accent?: string;
    readonly fields: TFields;
    readonly inputs: TInputs;
    readonly outputs: TOutputs;
}

export function defineBlueprint<
    const TId extends string,
    const TFields extends readonly Foundations.Field[],
    const TInputs extends readonly Foundations.Port.Input[],
    const TOutputs extends readonly Foundations.Port.Output[]
>(config: {
    id: TId;
    displayName: string;
    description: string;
    icon: string;
    accent?: string;
    fields: TFields;
    inputs: TInputs;
    outputs: TOutputs;
}): DefineBlueprintReturn<TId, TFields, TInputs, TOutputs> {
    return {
        id: config.id as TId & Foundations.Blueprint.Id,
        displayName: config.displayName,
        description: config.description,
        icon: config.icon,
        accent: config.accent,
        fields: config.fields,
        inputs: config.inputs,
        outputs: config.outputs,
    };
}