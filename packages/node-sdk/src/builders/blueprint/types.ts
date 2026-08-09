import type { Webhook }            from "@pretzel-graph/shared/domain/Webhook";
import type { Port }               from "@pretzel-graph/shared/domain/Foundations/Port";
import type { Field }              from "@pretzel-graph/shared/domain/Foundations/Field";
import type { Blueprint }          from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import type { Derivative }         from "@pretzel-graph/shared/domain/Foundations/Blueprint/derivative";
import type { CredentialTemplate } from "../credential";
import { FieldBuilder }            from "../field";


export type ReservedDefinitionKey =
    | "id" | "displayName" | "description" | "icon" | "accent" | "iconColor"
    | "fields" | "inputs" | "outputs" | "credentials" | "webhooks"
    | "toolCompatible" | "proxyCompatible" | "igniter" | "passive" | "flags" | "itemScope"

export const RESERVED_DEFINITION_KEYS: ReadonlySet<string> = new Set<ReservedDefinitionKey>([
    "id", "displayName", "description", "icon", "accent", "iconColor",
    "fields", "inputs", "outputs", "credentials", "webhooks",
    "toolCompatible", "proxyCompatible", "igniter", "passive", "flags", "itemScope",
])


// Named explicitly so blueprint type errors read as `DefineBlueprintReturn<"Integrations.Tavily.Search", …>`
// rather than spilling the whole structural type. Also referenced by defineBlueprint's internal
// `fields` cast, which is what preserves the readonly literal tuple.
export type DefineBlueprintReturn<
    TId             extends string,
    TFields         extends readonly Field[],
    TInputs         extends readonly Port.Input[],
    TOutputs        extends readonly Port.Output[],
    TWebhooks       extends readonly Webhook[]              = readonly [],
    TToolCompatible extends boolean                         = false,
    TCredentials    extends readonly CredentialTemplate[]   = readonly [],
    TFlags          extends Record<string, unknown>         = Record<string, unknown>,
> = {
    readonly id:               TId & Blueprint.Id;
    readonly ui: {
        readonly displayName: string;
        readonly description: string;
        readonly icon:        string;
        readonly accent?:     string;
        readonly iconColor?:  string;
    };
    readonly fields: TToolCompatible extends true
        ? readonly [...TFields, ...typeof FieldBuilder.DEFAULTS.StandardNode, typeof FieldBuilder.DEFAULTS.toolConvertedField]
        : readonly [...TFields, ...typeof FieldBuilder.DEFAULTS.StandardNode];
    readonly inputs:           TInputs;
    readonly outputs:          TOutputs;
    readonly webhooks?:        TWebhooks;
    readonly toolCompatible:   TToolCompatible;
    readonly proxyCompatible?: boolean;
    readonly igniter?:         boolean;
    readonly passive?:         boolean;
    readonly credentials:      TCredentials;
    readonly flags?:           TFlags;
    // Input port id whose array is iterated for this node's item-scoped fields (FieldBuilder.itemScoped).
    readonly itemScope?:       string;
    // Serialized form — erased of literals, which is why narrowing reads __definition instead.
    readonly _derivatives?:    readonly Derivative[];
}


// A derivative body: the same members a blueprint contributes, minus identity, plus nested
// condition keys. Recursion is deferred through the mapped type, so the alias stays legal.
export type DerivativeBody = {
    fields?:      readonly Field[];
    inputs?:      readonly Port.Input[];
    outputs?:     readonly Port.Output[];
    credentials?: readonly CredentialTemplate[];
    ui?:          Partial<Blueprint["ui"]>;
    // Members this branch replaces rather than appends to — see Derivative.replaces.
    replaces?:    readonly Derivative.Member[];
} & {
    [K in ConditionKey]?: DerivativeBody;
}

// Authoring syntax for a condition key. Catches a malformed key ("action = list") at the call
// site; that the field exists and the value is one of its options stays a load-time check.
export type ConditionKey = `${string}==${string}` | `${string}!=${string}`


/**
 * A terminal contribution — a contribution, not a scope.
 *
 * Tool mode inverts the node's philosophy: instead of selecting one action and deriving its shape,
 * the node exposes its whole surface and the agent picks. So it declares its own fields and ports
 * outright rather than layering onto the run-mode ones, and nothing nests inside it. Condition
 * keys are typed `never` here to enforce that at the call site.
 */
export type ToolBody = {
    fields?:      readonly Field[];
    inputs?:      readonly Port.Input[];
    outputs?:     readonly Port.Output[];
    credentials?: readonly CredentialTemplate[];
    ui?:          Partial<Blueprint["ui"]>;
} & {
    [K in ConditionKey]?: never;
}

// What defineTool returns — the marker is what compileDerivatives keys off.
export type ToolContribution = ToolBody & { readonly __tool: true }
