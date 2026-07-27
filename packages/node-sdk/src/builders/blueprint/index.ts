import type { Webhook }            from "@pretzel-graph/shared/domain/Webhook";
import type { Port }               from "@pretzel-graph/shared/domain/Foundations/Port";
import type { Field }              from "@pretzel-graph/shared/domain/Foundations/Field";
import { Blueprint }          from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import type { CredentialTemplate } from "../credential";
import { NetworkProxyCredential }  from "../../credentials/networkProxy";
import { FieldBuilder }            from "../field";
import type { DefineBlueprintReturn, ConditionKey, DerivativeBody, ToolContribution } from "./types";
import { compileDerivatives, stampDiscriminants } from "./derivatives";

export type { DefineBlueprintReturn, DerivativeBody, ToolBody } from "./types"
export { defineTool } from "./tool"



export function defineBlueprint<
    const TId             extends string,
    const TFields         extends readonly Field[],
    const TInputs         extends readonly Port.Input[],
    const TOutputs        extends readonly Port.Output[],
    const TWebhooks       extends readonly Webhook[]            = readonly [],
    const TToolCompatible extends boolean                       = false,
    const TCredentials    extends readonly CredentialTemplate[] = readonly [],
    const TFlags          extends Record<string, unknown>       = Record<string, unknown>,
    // Captures the authored object verbatim, condition keys included, so InferFieldValues can
    // narrow on a discriminant. `_derivatives` is the serialized form and carries no literals.
    const TDefinition     extends Record<string, unknown>       = Record<string, never>,
>(definition: TDefinition & {
    id:               TId;
    displayName:      string;
    description:      string;
    icon:             string;
    accent?:          string;
    iconColor?:       string;
    fields:           TFields;
    inputs:           TInputs;
    outputs:          TOutputs;
    webhooks?:        TWebhooks;
    toolCompatible?:  TToolCompatible;
    proxyCompatible?: boolean;
    credentials?:     TCredentials;
    flags?:           TFlags;
    itemScope?:       string;
} & {
    [K in ConditionKey]?: DerivativeBody | ToolContribution;
}): DefineBlueprintReturn<TId, TFields, TInputs, TOutputs, TWebhooks, TToolCompatible, TCredentials, TFlags>
   & { readonly __definition?: TDefinition } {

    // itemScope is a free string — validate it names a real input port at module load.
    if (definition.itemScope !== undefined && !definition.inputs.some(i => (i.id as string) === definition.itemScope))
        throw new Error(`defineBlueprint(${definition.id}): itemScope "${definition.itemScope}" is not a declared input port id`);

    const baseFields = [
        ...definition.fields,
        ...FieldBuilder.DEFAULTS.StandardNode,
    ] as const;

    const withDefaults = (
        definition.toolCompatible
        ? [...baseFields, FieldBuilder.DEFAULTS.toolConvertedField]
        : baseFields) as readonly Field[];

    // Framework defaults are in the pool before conditions are checked, so a blueprint can
    // branch on "isConvertedToTool==true" without declaring the field.
    const { derivatives, discriminantIds } = compileDerivatives(
        definition.id,
        definition as unknown as Record<string, unknown>,
        withDefaults,
    );

    const fields = stampDiscriminants(withDefaults, discriminantIds) as
        DefineBlueprintReturn<TId, TFields, TInputs, TOutputs, TWebhooks, TToolCompatible>["fields"];

    return {
        id: definition.id as TId & Blueprint.Id,
        ui: {
            displayName: definition.displayName,
            description: definition.description,
            icon:        definition.icon,
            accent:      definition.accent,
            iconColor:   definition.iconColor,
        },
        fields,
        inputs:          definition.inputs,
        outputs:         definition.outputs,
        webhooks:        definition.webhooks,
        toolCompatible:  definition.toolCompatible as TToolCompatible,
        proxyCompatible: definition.proxyCompatible,
        credentials: (
            definition.proxyCompatible
                ? [...(definition.credentials ?? []), NetworkProxyCredential]
                : (definition.credentials ?? [])
        ) as unknown as TCredentials,
        flags:           definition.flags,
        itemScope:       definition.itemScope,
        // Omitted entirely when there are no condition keys, so existing blueprints serialize
        // byte-identically to before.
        ...(derivatives.length ? { _derivatives: derivatives } : {}),
    }
}
