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
    readonly ui: { readonly icon: string; readonly accent?: string; readonly iconColor?: string };
    readonly fields: TToolCompatible extends true
        ? readonly [...TFields, ...typeof executionStrategyFields, typeof hiddenToolField]
        : readonly [...TFields, ...typeof executionStrategyFields];
    readonly inputs: TInputs;
    readonly outputs: TOutputs;
    readonly webhooks?: TWebhooks;
    readonly toolCompatible: TToolCompatible;
    readonly credentials: TCredentials;
    readonly flags?: TFlags;
    // Input port id whose array is iterated for this node's item-scoped fields (FieldBuilder.itemScoped).
    readonly itemScope?: string;
}

const hiddenToolField = FieldBuilder.reconciling(FieldBuilder.Boolean({
    id: "isConvertedToTool",
    displayName: "Tool Mode",
    hidden: true,
    initialValue: false,
}));



export const signalDependencyStrategyField = FieldBuilder.MultiOption({
    id: "signalDependency",
    displayName: "Signal Dependency",
    options: [
        { value: "AND", displayName: "(AND) All signals required", description: "Fire only once every upstream signal has arrived." },
        { value: "OR", displayName: "(OR) At least one signal required", description: "Fire as soon as any upstream signal arrives (re-fires on each — enables cycles)." },
        { value: "XOR", displayName: "(XOR) Exactly one signal required", description: "Fire on exactly one signal. If two or more arrive at once, the run fails with a collision error." },
    ],
    initialValue: "OR",
    tooltip: "Determines how incoming signals are evaluated to trigger node execution.",
})




export const dataDependencyStrategyField = FieldBuilder.MultiOption({
    id: "dataDependency",
    displayName: "Data Dependency",
    options: [
        { value: "AND", displayName: "Wait & Join", description: "Wait until every wired input port has resolved, then read all of them." },
        { value: "OR", displayName: "Follow Trigger", description: "Don't wait — read only the input port(s) that propagated the triggering signal." },
    ],
    initialValue: "AND",
    tooltip: "Controls how the node gathers its inputs once it's been triggered: wait for all wired ports, or read only the ones that fired.",
})

export const onErrorStrategyField = FieldBuilder.MultiOption({
    id: "onErrorStrategy",
    displayName: "On Error",
    options: [
        { value: "terminate", displayName: "Terminate workflow", description: "Fail the whole run." },
        { value: "propagate", displayName: "Propagate error", description: "Forward the error along outgoing edges." },
        { value: "do_nothing", displayName: "Do nothing", description: "Swallow the error — no signal, no termination. Downstream stalls." },
    ],
    initialValue: "propagate",
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
    iconColor?: string;
    fields: TFields;
    inputs: TInputs;
    outputs: TOutputs;
    webhooks?: TWebhooks;
    toolCompatible?: TToolCompatible;
    credentials?: TCredentials;
    flags?: TFlags;
    itemScope?: string;
}): DefineBlueprintReturn<TId, TFields, TInputs, TOutputs, TWebhooks, TToolCompatible, TCredentials, TFlags> {

    // itemScope is a free string — validate it names a real input port at module load.
    if (config.itemScope !== undefined && !config.inputs.some(i => (i.id as string) === config.itemScope))
        throw new Error(`defineBlueprint(${config.id}): itemScope "${config.itemScope}" is not a declared input port id`);

    const baseFields = [
        ...config.fields,
        // Avoid duplicating execution strategy fields if they're already included in `config.fields`
        ...executionStrategyFields.filter(f => !config.fields.some(cf => cf.id === f.id)), 
    ] as const;

    const fields = (
        config.toolCompatible
        ? [...baseFields, hiddenToolField]
        : baseFields) as DefineBlueprintReturn<TId, TFields, TInputs, TOutputs, TWebhooks, TToolCompatible>["fields"];

    return {
        id: config.id as TId & Blueprint.Id,
        displayName: config.displayName,
        description: config.description,
        ui: { icon: config.icon, accent: config.accent, iconColor: config.iconColor },
        fields,
        inputs: config.inputs,
        outputs: config.outputs,
        webhooks: config.webhooks,
        toolCompatible: config.toolCompatible as TToolCompatible,
        credentials: (config.credentials ?? []) as unknown as TCredentials,
        flags: config.flags,
        itemScope: config.itemScope,
    };
}