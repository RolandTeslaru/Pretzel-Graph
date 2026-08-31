import type { Vault } from "@pretzel-graph/shared/domain"

/**
 * Infer static config values from a Blueprint.
 *
 * Uses __literalId phantom for literal key names.
 * Maps each config field to its initialValue type.
 */
type FlatFieldValues<D> = D extends { fields: infer T }
    ? T extends readonly { id: string }[]
    ? { [K in T[number]as K extends { itemScoped: true }
        ? never                                                     // item-scoped → not in this.fieldValues
        : K extends { __literalId?: infer Id extends string }
        ? Id
        : K extends { id: infer Id extends string } ? Id : never
        ]: K extends { initialValue: infer IV } ? IV : any
    }
    : never
    : Record<string, never>;


// ── derivative narrowing ──────────────────────────────────────────────────────
// A blueprint authored with condition keys ("mode==error") carries the authored definition
// on the __definition phantom, since `_derivatives` is the serialized form and has no literals.
// Narrowing on a discriminant then reveals that branch's fields:
//
//     if (this.fieldValues.mode === "error") this.fieldValues.message  // string
//
// Structural recursion over the authored object — deliberately no UnionToTuple and no
// cross-product of sibling discriminants, which is what made the old shape inference expensive.

type StructuralKey =
    | "id" | "displayName" | "description" | "icon" | "accent" | "iconColor"
    | "fields" | "inputs" | "outputs" | "credentials" | "webhooks"
    | "toolCompatible" | "proxyCompatible" | "igniter" | "passive" | "flags" | "itemScope" | "ui"
    | "replaces" | "__tool"

type ConditionKeys<T> = Exclude<Extract<keyof T, string>, StructuralKey>

// Framework-owned fields. A condition on one is a real derivative at runtime — tool mode swaps
// ports that way — but it's an axis orthogonal to the node's own discriminants, so it stays out
// of the narrowing union. Folding both axes in would need a cross-product, which blows the
// checker's instantiation limit. Ports contributed by these branches still resolve through
// InferOutputs/InferIncoming, which test each condition independently.
type FrameworkDiscriminant =
    "isConvertedToTool" | "signalDependency" | "dataDependency" | "onErrorStrategy"

type NarrowingKeys<T> = {
    [K in ConditionKeys<T>]:
        T[K] extends { __tool: true } ? never                                    // its own arm, below
        : ParseKey<K & string> extends { f: FrameworkDiscriminant } ? never
        : K
}[ConditionKeys<T>]

type ToolKeys<T> = {
    [K in ConditionKeys<T>]: T[K] extends { __tool: true } ? K : never
}[ConditionKeys<T>]

type ParseKey<K extends string> =
    K extends `${infer F}==${infer V}` ? { f: F; v: V; eq: true }
    : K extends `${infer F}!=${infer V}` ? { f: F; v: V; eq: false }
    : never

type UnionToIntersection<T> =
    (T extends unknown ? (x: T) => void : never) extends (x: infer I) => void ? I : never

type IdOf<F> =
    F extends { __literalId?: infer Id extends string } ? Id
    : F extends { id: infer Id extends string } ? Id
    : never

type FieldsAt<T> = T extends { fields: infer A extends readonly unknown[] } ? A[number] : never

type ValuesAt<T> =
    [FieldsAt<T>] extends [never] ? {}
    : UnionToIntersection<FieldsAt<T> extends infer F
        ? (F extends unknown ? { [K in IdOf<F>]: F extends { initialValue: infer IV } ? IV : any } : never)
        : never>

// MultiOption's builder types `initialValue` as the union of its option values, so this is
// already the full discriminant domain — no need to read `options`.
type ValueById<TPool, Id extends string> =
    TPool extends unknown
        ? IdOf<TPool> extends Id ? (TPool extends { initialValue: infer IV } ? IV : never) : never
        : never

type Coerce<TVal, TLit extends string> =
    TVal extends boolean ? (TLit extends "true" ? true : false)
    : TVal extends number ? (TLit extends `${infer N extends number}` ? N : never)
    : TLit

// Which discriminant values a single condition covers. `!=` covers the complement, so the
// unmatched arm below stays disjoint from it — otherwise narrowing can't eliminate either.
type CoveredBy<K extends string, TPool> =
    ParseKey<K> extends { f: infer F extends string; v: infer V extends string; eq: infer Eq }
        ? Eq extends true
            ? Coerce<ValueById<TPool, F>, V>
            : Exclude<ValueById<TPool, F>, Coerce<ValueById<TPool, F>, V>>
        : never

// Every value some sibling branch on the SAME discriminant covers, so the leftovers get an arm.
type MatchedLiterals<T, F extends string, TPool> = {
    [K in KeysForField<T, F>]: CoveredBy<K & string, TPool>
}[KeysForField<T, F>]

type DiscriminantOf<T> = ParseKey<NarrowingKeys<T>> extends { f: infer F extends string } ? F : never

type UnmatchedArm<T, F extends string, TPool> =
    Exclude<ValueById<TPool, F>, MatchedLiterals<T, F, TPool>> extends infer R
        ? [R] extends [never] ? never : { [P in F]: R }
        : never

type BranchArm<T, K extends ConditionKeys<T>, TPool> =
    ParseKey<K & string> extends { f: infer F extends string; v: infer V extends string; eq: infer Eq }
        ? {
            [P in F]: Eq extends true
                ? Coerce<ValueById<TPool, F>, V>
                : Exclude<ValueById<TPool, F>, Coerce<ValueById<TPool, F>, V>>
        } & InferBody<T[K], TPool | FieldsAt<T[K]>>
        : never

type KeysForField<T, F extends string> = {
    [K in ConditionKeys<T>]: ParseKey<K & string> extends { f: F } ? K : never
}[ConditionKeys<T>]

// One axis: the node's own discriminant. Intersecting a second axis for the framework fields
// (so `isConvertedToTool === true` would narrow) produces a cross-product TypeScript can't
// represent — measured, it fails with "union type too complex". Tool mode therefore stays on
// onBuildTool rather than collapsing into onRun.
type Branches<T, TPool> =
    [NarrowingKeys<T>] extends [never] ? {}
    : { [K in NarrowingKeys<T>]: BranchArm<T, K & ConditionKeys<T>, TPool> }[NarrowingKeys<T>]
        | UnmatchedArm<T, DiscriminantOf<T>, TPool>

type InferBody<T, TPool> = ValuesAt<T> & Branches<T, TPool>

type Definitionof<D> = D extends { __definition?: infer TDef } ? Exclude<TDef, undefined> : never


// Framework fields outlive a defineTool replacement, so they appear on both arms.
type FrameworkFields<D> =
    Pick<FlatFieldValues<D>, Extract<keyof FlatFieldValues<D>, FrameworkDiscriminant>>;

/**
 * Tool mode's arm. Because defineTool is *terminal and total-replacing*, this is disjoint from
 * the run-mode arms rather than orthogonal to them — a sum, not a product. That's what makes it
 * affordable, and what lets `onRun` narrow on the discriminant.
 */
// The tool discriminant is a framework field: it's appended to the blueprint, not declared in
// the definition's own `fields`, so its value type has to come from FlatFieldValues.
type ValueOfField<D, F extends string> =
    F extends keyof FlatFieldValues<D> ? FlatFieldValues<D>[F] : never;

type ToolArm<D, TDef> =
    [ToolKeys<TDef>] extends [never] ? never
    : {
        [K in ToolKeys<TDef>]:
            ParseKey<K & string> extends { f: infer F extends string; v: infer V extends string }
                ? { [P in F]: Coerce<ValueOfField<D, F>, V> }
                    & ValuesAt<TDef[K]>
                    & FrameworkFields<D>
                : never
    }[ToolKeys<TDef>];

// Run mode carries the complement of whatever the tool arm covers, so testing the discriminant
// eliminates one side cleanly.
type RunComplement<D, TDef> =
    [ToolKeys<TDef>] extends [never] ? {}
    : ParseKey<ToolKeys<TDef> & string> extends { f: infer F extends string; v: infer V extends string }
        ? { [P in F]: Exclude<ValueOfField<D, F>, Coerce<ValueOfField<D, F>, V>> }
        : {};

type RunArm<D, TDef> =
    FlatFieldValues<D> & Branches<TDef, FieldsAt<TDef>> & RunComplement<D, TDef>;

export type InferFieldValues<D> = 0 extends (1 & D) ? any
    : [ConditionKeys<Definitionof<D>>] extends [never]
        // No condition keys — identical to the pre-derivatives behaviour.
        ? FlatFieldValues<D>
        // ToolArm collapses to `never` when there's no defineTool branch, leaving RunArm alone.
        : ToolArm<D, Definitionof<D>> | RunArm<D, Definitionof<D>>;

/**
 * Complement of InferFieldValues: only the item-scoped fields, keyed by literal id, mapped to
 * their value type. These are NOT in `this.fieldValues` — they're evaluated per-item via
 * RuntimeNode.evalItemField. Keying off the required literal `{ itemScoped: true }` (set by
 * FieldBuilder.itemScoped) so the optional `itemScoped?: boolean` on every field's base
 * never false-matches.
 */
export type InferItemFields<D> = 0 extends (1 & D) ? any
    : D extends { fields: infer T }
    ? T extends readonly { id: string }[]
    ? { [K in T[number]as K extends { itemScoped: true }
        ? (K extends { __literalId?: infer Id extends string }
            ? Id
            : K extends { id: infer Id extends string } ? Id : never)
        : never
        ]: K extends { initialValue: infer IV } ? IV : any
    }
    : never
    : Record<string, never>;

/**
 * Like InferFieldValues, but only includes fields where initialValue was
 * explicitly provided at the builder call site (__hasInitialValue is true).
 */
export type InferFieldsWithInitial<D> = D extends { fields: infer T }
    ? T extends readonly { id: string }[]
    ? { [K in T[number]as (
        K extends { __hasInitialValue?: true }
        ? (K extends { __literalId?: infer Id extends string }
            ? Id
            : K extends { id: infer Id extends string } ? Id : never)
        : never
    )]: K extends { initialValue: infer IV } ? IV : any
    }
    : never
    : Record<string, never>;


/**
 * Infer runtime port input values from a Blueprint.
 *
 * Uses __reference phantom if present (set by InputBuilder.Message → BaseMessage, etc.)
 * Falls back to initialValue type, then `any`.
 * Uses __required phantom to make optional ports (required: false, the default) produce
 * optional keys so callers must handle undefined.
 */
type _InputKey<K> =
    K extends { __literalId?: infer Id extends string } ? Id
    : K extends { id: infer Id extends string } ? Id
    : never;

type _InputValue<K> =
    K extends { __reference?: infer V }
    ? [NonNullable<V>] extends [never]
    ? (K extends { initialValue: infer IV } ? IV : any)
    : NonNullable<V>
    : K extends { initialValue: infer IV } ? IV : any;

type _InferInputsRaw<T extends readonly { id: string }[]> = {
    [K in T[number] as K extends { __required?: true } ? _InputKey<K> : never]: _InputValue<K>
} & {
    [K in T[number] as K extends { __required?: true } ? never : _InputKey<K>]?: _InputValue<K>
};

type IncomingObject<T> = T extends readonly { id: string }[]
    ? { [K in keyof _InferInputsRaw<T>]: _InferInputsRaw<T>[K] }
    : never;

type CollectIncoming<TDef, TValues, TWant extends boolean, D extends number = 5> =
    D extends 0 ? {}
    : [ConditionKeys<TDef>] extends [never] ? {}
    : UnionToIntersection<{
        [K in ConditionKeys<TDef>]: ConditionHolds<TValues, K & string> extends true
            ? (DeclaresReplace<TDef[K], "inputs"> extends TWant
                ? IncomingObject<TDef[K] extends { inputs: infer I } ? I : readonly []>
                : {})
                & CollectIncoming<TDef[K], TValues, TWant, Prev[D]>
            : {}
    }[ConditionKeys<TDef>]>;

/**
 * Input port values a node receives.
 *
 * Pass the narrowed field values as the second argument to pick up the ports a matched
 * derivative contributes. Note `satisfies` only *checks* — it does not retype the binding, so
 * reading a branch-only port needs a narrowed local:
 *
 *     if (fields.shape === "text") {
 *         const input = this.incomingFor(fields, incoming)   // typed to this branch
 *     }
 */
export type InferIncoming<D, TValues = never> = 0 extends (1 & D) ? any
    : D extends { inputs: infer T }
    ? [TValues] extends [never]
        ? IncomingObject<T>
        : ReplacesMember<Definitionof<D>, TValues, "inputs"> extends true
            ? CollectIncoming<Definitionof<D>, TValues, true>
            : IncomingObject<T> & CollectIncoming<Definitionof<D>, TValues, false>
    : never;


/**
 * Ports of a node's `isConvertedToTool==true` derivative.
 *
 * The framework discriminants are excluded from InferFieldValues' narrowing union — folding them
 * in needs a cross-product TypeScript can't represent. But nothing forces us to *narrow* to reach
 * that branch: ConditionHolds tests each condition against whatever type it's handed, so asserting
 * the condition directly resolves the branch with no union involved.
 *
 *     protected override async onBuildTool(): Promise<InferToolOutputs<typeof Blueprint>> {
 *         return { tool: … }        // typed to the branch, `replaces` honoured
 *     }
 */
type ToolMode = { isConvertedToTool: true };

export type InferToolOutputs<D>  = InferOutputs<D, ToolMode>;
export type InferToolIncoming<D> = InferIncoming<D, ToolMode>;

/**
 * Field values in tool mode — the defineTool body's own fields, since it replaces the run-mode
 * ones outright. `this.fieldValues` is typed for run mode, so onBuildTool casts through this.
 */
export type InferToolFieldValues<D> =
    [ToolKeys<Definitionof<D>>] extends [never] ? Record<string, never>
    : UnionToIntersection<{
        [K in ToolKeys<Definitionof<D>>]: ValuesAt<Definitionof<D>[K]>
    }[ToolKeys<Definitionof<D>>]>;

/**
 * Infer runtime output values from a Blueprint.
 * 
 * Uses __reference phantom if present (set by OutputBuilder.Message → BaseMessage, etc.)
 * Falls back to `any`.
 */
/**
 * Given an object type T, produces a union where exactly one key is present
 * and all other keys are explicitly disallowed (set to never).
 *
 * Useful for router nodes that must fire exactly one output branch.
 */
export type OneOf<T> = {
    [K in keyof T]: Pick<T, K> & Partial<Record<Exclude<keyof T, K>, never>>;
}[keyof T];

type OutputsObject<T> = T extends readonly { id: string }[]
    ? { [K in T[number]as K extends { __literalId?: infer Id extends string }
        ? Id
        : K extends { id: infer Id extends string } ? Id : never
        ]: K extends { __reference?: infer V }
        ? [NonNullable<V>] extends [never]
        ? any
        : NonNullable<V>
        : any
    }
    : never;

// Does a narrowed field-values type satisfy this condition? Deliberately "certain", not
// "possible": an un-narrowed union fails, so the outputs you owe are only ever the ones the
// branch you're actually inside declares.
type ConditionHolds<TValues, K extends string> =
    ParseKey<K> extends { f: infer F extends string; v: infer V extends string; eq: infer Eq }
        ? [TValues] extends [{ [P in F]: infer Actual }]
            ? Eq extends true
                ? [Actual] extends [Coerce<Actual, V>] ? true : false
                : [Extract<Actual, Coerce<Actual, V>>] extends [never] ? true : false
            : false
        : false;

// Recursion budget. The authored tree is only a few levels deep, but these types are also
// instantiated against unresolved generics (RuntimeNode's T_Blueprint), where TypeScript can't
// prove termination and bails with "excessively deep".
type Prev = [never, 0, 1, 2, 3, 4, 5];

// defineTool is terminal and total — it replaces every member. The `replaces` array is added by
// the compiler, so the authored type carries only the marker.
type DeclaresReplace<TBody, M extends string> =
    TBody extends { __tool: true } ? true
    : TBody extends { replaces: readonly (infer R)[] } ? (M extends R ? true : false)
    : false;

// Does any branch that holds — at any depth — replace this member? Mirrors derive()'s second
// pass: when one does, the base and every appending branch are discarded for that member.
type ReplacesMember<TDef, TValues, M extends string, D extends number = 5> =
    D extends 0 ? false
    : [ConditionKeys<TDef>] extends [never] ? false
    : true extends {
        [K in ConditionKeys<TDef>]: ConditionHolds<TValues, K & string> extends true
            ? DeclaresReplace<TDef[K], M> extends true
                ? true
                : ReplacesMember<TDef[K], TValues, M, Prev[D]>
            : false
    }[ConditionKeys<TDef>] ? true : false;

// Contributions from holding branches, keeping only those whose replace-ness matches TWant.
type CollectOutputs<TDef, TValues, TWant extends boolean, D extends number = 5> =
    D extends 0 ? {}
    : [ConditionKeys<TDef>] extends [never] ? {}
    : UnionToIntersection<{
        [K in ConditionKeys<TDef>]: ConditionHolds<TValues, K & string> extends true
            ? (DeclaresReplace<TDef[K], "outputs"> extends TWant
                ? OutputsObject<TDef[K] extends { outputs: infer O } ? O : readonly []>
                : {})
                & CollectOutputs<TDef[K], TValues, TWant, Prev[D]>
            : {}
    }[ConditionKeys<TDef>]>;

/**
 * Output values a node must return.
 *
 * Pass the narrowed field values as the second argument to pick up the outputs a matched
 * derivative contributes:
 *
 *     if (fields.shape === "text")
 *         return { value: fields.text }        // InferOutputs<typeof Blueprint, typeof fields>
 *
 * Omitting it keeps the pre-derivatives behaviour — base outputs only.
 */
export type InferOutputs<D, TValues = never> = 0 extends (1 & D) ? any
    : D extends { outputs: infer T }
    ? [TValues] extends [never]
        ? OutputsObject<T>
        : ReplacesMember<Definitionof<D>, TValues, "outputs"> extends true
            ? CollectOutputs<Definitionof<D>, TValues, true>
            : OutputsObject<T> & CollectOutputs<Definitionof<D>, TValues, false>
    : never;

/**
 * Decrypted field values for one credential template, keyed by field literal id.
 */
export type InferCredentialValues<C> = 0 extends (1 & C) ? any
    : C extends { auth: { kind: "oauth2" } } ? Vault.OAuth.Values
    : C extends { fields: infer F }
    ? F extends readonly { id: string }[]
    ? { [K in F[number] as K extends { __literalId?: infer Id extends string }
            ? Id
            : K extends { id: infer Id extends string } ? Id : never
        ]: K extends { initialValue: infer IV } ? IV : string
      }
    : Record<string, string>
    : Record<string, string>;

/**
 * Infer credential instances from a Blueprint, keyed by credential template id.
 * Each value is the resolved Vault.Credential.Instance at runtime, with its
 * `blob` phantom-branded with the template type so that
 * `credentialsAPI.getDecryptedValue(templateId)` returns a fully-typed record.
 */
export type InferCredentials<D> = 0 extends (1 & D) ? any
    : D extends { credentials?: infer T }
    ? T extends readonly { id: string }[]
    ? { [K in T[number] as K extends { __literalId?: infer Id extends string } ? Id : K extends { id: infer Id extends string } ? Id : never]:
            Omit<Vault.Credential.Instance, "blob"> & { readonly blob: Vault.Credential.Instance.EncryptedBlob<K> }
      }
    : Record<string, never>
    : Record<string, never>;

/**
 * Extracts the credential template type T from a phantom-branded
 * `EncryptedBlob<T>` sitting on a credential instance entry.
 *
 * Used by `credentialsAPI.getDecryptedValue` to infer the exact field-value
 * record from the template that was used to create the blob.
 *
 * @example
 * // Given: InferCredentials<Blueprint>["googleGeminiApi"]
 * //        = Omit<Instance, "blob"> & { blob: EncryptedBlob<GoogleGemini> }
 * // ExtractCredentialTemplate<...> = GoogleGemini
 * // InferCredentialValues<GoogleGemini> = { apiKey: string }
 */
export type ExtractCredentialTemplate<I> =
    I extends { blob: Vault.Credential.Instance.EncryptedBlob<infer T> } ? T : never;

/**
 * Infer webhook definitions from a Blueprint into a record keyed by webhook id.
 */
export type InferWebhooks<D> = 0 extends (1 & D) ? any
    : D extends { webhooks?: infer T }
    ? T extends readonly { id: string }[]
    ? { [K in T[number]as K extends { __literalId?: infer Id extends string }
        ? Id
        : K extends { id: infer Id extends string } ? Id : never
        ]: K
    }
    : Record<string, never>
    : Record<string, never>;
