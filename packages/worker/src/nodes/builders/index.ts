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
    readonly fields: TToolCompatible extends true
        ? readonly [...TFields, ...typeof executionStrategyFields, typeof hiddenToolField]
        : readonly [...TFields, ...typeof executionStrategyFields];
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



export const signalDependencyStrategyField = FieldBuilder.MultiOption({
    id: "signalDependency",
    displayName: "Signal Dependency",
    options: [
        { value: "AND", displayName: "(AND) All signals required" },
        { value: "OR", displayName: "(OR) At least one signal required" },
        { value: "XOR", displayName: "(XOR) Exactly one signal required" },
    ],
    initialValue: "OR",
    tooltip: "Determines how incoming signals are evaluated to trigger node execution. 'OR' requires at least one signal, 'AND' requires all signals, and 'XOR' requires exactly one signal.",
})

export const dataDependencyStrategyField = FieldBuilder.MultiOption({
    id: "dataDependency",
    displayName: "Data Dependency",
    options: [
        { value: "AND", displayName: "(AND) All data dependencies must be ready" },
        { value: "OR", displayName: "(OR) At least one data dependency ready" },
    ],
    initialValue: "AND",
    tooltip: "Determines how incoming data dependencies are evaluated to trigger node execution. 'OR' requires at least one data input to be ready, while 'AND' requires all data inputs to be ready.",
})

export const executionStrategyFields = [signalDependencyStrategyField, dataDependencyStrategyField] as const;


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

    const baseFields = [
        ...config.fields,
        ...executionStrategyFields
    ] as const;

    const fields = (
        config.toolCompatible
        ? [...baseFields, hiddenToolField]
        : baseFields) as DefineBlueprintReturn<TId, TFields, TInputs, TOutputs, TToolCompatible>["fields"];

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