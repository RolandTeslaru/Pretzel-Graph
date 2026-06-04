import type { Foundations, Vault } from "@pretzel-graph/shared/domain";
import type { Webhook } from "@pretzel-graph/shared/domain/Webhook";
import type { Port }  from "@pretzel-graph/shared/domain/Foundations/Port";
import type { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import type { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import type { CredentialTemplate } from "./credential";
import { FieldBuilder } from "./field";
export { FieldBuilder } from "./field"
export { InputBuilder } from "./input"
export { OutputBuilder } from "./output"
export { WebhookBuilder } from "./webhook"
export { defineCredential } from "./credential"
export { defineLoaders } from "./loaders"
export type { CredentialTemplate } from "./credential"


// ============================================
// BLUEPRINT BUILDER
// ============================================


// Explicit return type to avoid "cannot be named without reference to zod internals" error
type DefineBlueprintReturn<
    TId extends string,
    TFields extends readonly Field[],
    TInputs extends readonly Port.Input[],
    TOutputs extends readonly Port.Output[],
    TWebhooks extends readonly Webhook[] = readonly [],
    TToolCompatible extends boolean = false,
    TCredentials extends readonly CredentialTemplate[] = readonly [],
    TFlags extends Record<string, unknown> = Record<string, unknown>,
> = {
    readonly id: TId & Blueprint.Id;
    readonly displayName: string;
    readonly description: string;
    readonly icon: string;
    readonly accent?: string;
    readonly fields: TToolCompatible extends true
        ? readonly [...TFields, ...typeof executionStrategyFields, typeof hiddenToolField]
        : readonly [...TFields, ...typeof executionStrategyFields];
    readonly inputs: TInputs;
    readonly outputs: TOutputs;
    readonly webhooks?: TWebhooks;
    readonly toolCompatible: TToolCompatible;
    readonly credentials: TCredentials;
    readonly flags?: TFlags;
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
        { value: "AND", displayName: "(AND) All signals required", description: "Fire only once every upstream signal has arrived." },
        { value: "OR", displayName: "(OR) At least one signal required", description: "Fire as soon as any upstream signal arrives (re-fires on each — enables cycles)." },
        { value: "XOR", displayName: "(XOR) Exactly one signal required", description: "Fire on exactly one signal; rejects if two or more arrive at once." },
    ],
    initialValue: "OR",
    tooltip: "Determines how incoming signals are evaluated to trigger node execution.",
})

export const dataDependencyStrategyField = FieldBuilder.MultiOption({
    id: "dataDependency",
    displayName: "Data Dependency",
    options: [
        { value: "AND", displayName: "(AND) All data dependencies must be ready", description: "Wait until every wired input port has data before reading inputs." },
        { value: "OR", displayName: "(OR) At least one data dependency ready", description: "Read inputs as soon as any wired port has data." },
    ],
    initialValue: "AND",
    tooltip: "Determines how incoming data dependencies are evaluated to trigger node execution.",
})

export const onErrorStrategyField = FieldBuilder.MultiOption({
    id: "onErrorStrategy",
    displayName: "On Error",
    options: [
        { value: "terminate", displayName: "Terminate workflow", description: "Fail the whole run (default)." },
        { value: "propagate", displayName: "Propagate error", description: "Forward the error along outgoing edges until a Catch node handles it — or it reaches a node with no outputs and terminates." },
        { value: "do_nothing", displayName: "Do nothing", description: "Swallow the error — no signal, no termination. Downstream stalls." },
    ],
    initialValue: "terminate",
    tooltip: "What happens when this node's execution throws.",
})

export const executionStrategyFields = [signalDependencyStrategyField, dataDependencyStrategyField, onErrorStrategyField] as const;


export function defineBlueprint<
    const TId extends string,
    const TFields extends readonly Field[],
    const TInputs extends readonly Port.Input[],
    const TOutputs extends readonly Port.Output[],
    const TWebhooks extends readonly Webhook[] = readonly [],
    const TToolCompatible extends boolean = false,
    const TCredentials extends readonly CredentialTemplate[] = readonly [],
    const TFlags extends Record<string, unknown> = Record<string, unknown>,
>(config: {
    id: TId;
    displayName: string;
    description: string;
    icon: string;
    accent?: string;
    fields: TFields;
    inputs: TInputs;
    outputs: TOutputs;
    webhooks?: TWebhooks;
    toolCompatible?: TToolCompatible;
    credentials?: TCredentials;
    flags?: TFlags;
}): DefineBlueprintReturn<TId, TFields, TInputs, TOutputs, TWebhooks, TToolCompatible, TCredentials, TFlags> {

    const baseFields = [
        ...config.fields,
        ...executionStrategyFields
    ] as const;

    const fields = (
        config.toolCompatible
        ? [...baseFields, hiddenToolField]
        : baseFields) as DefineBlueprintReturn<TId, TFields, TInputs, TOutputs, TWebhooks, TToolCompatible>["fields"];

    return {
        id: config.id as TId & Blueprint.Id,
        displayName: config.displayName,
        description: config.description,
        icon: config.icon,
        accent: config.accent,
        fields,
        inputs: config.inputs,
        outputs: config.outputs,
        webhooks: config.webhooks,
        toolCompatible: config.toolCompatible as TToolCompatible,
        credentials: (config.credentials ?? []) as unknown as TCredentials,
        flags: config.flags,
    };
}