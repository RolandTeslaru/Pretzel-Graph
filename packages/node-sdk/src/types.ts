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
    | "toolCompatible" | "proxyCompatible" | "flags" | "itemScope" | "ui"

type ConditionKeys<T> = Exclude<Extract<keyof T, string>, StructuralKey>

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

// Every value some sibling branch covers, so the leftovers get their own arm.
type MatchedLiterals<T, TPool> = {
    [K in ConditionKeys<T>]: CoveredBy<K & string, TPool>
}[ConditionKeys<T>]

type DiscriminantOf<T> = ParseKey<ConditionKeys<T>> extends { f: infer F extends string } ? F : never

type UnmatchedArm<T, TPool> =
    DiscriminantOf<T> extends infer F extends string
        ? Exclude<ValueById<TPool, F>, MatchedLiterals<T, TPool>> extends infer R
            ? [R] extends [never] ? never : { [P in F]: R }
            : never
        : never

type BranchArm<T, K extends ConditionKeys<T>, TPool> =
    ParseKey<K & string> extends { f: infer F extends string; v: infer V extends string; eq: infer Eq }
        ? {
            [P in F]: Eq extends true
                ? Coerce<ValueById<TPool, F>, V>
                : Exclude<ValueById<TPool, F>, Coerce<ValueById<TPool, F>, V>>
        } & InferBody<T[K], TPool | FieldsAt<T[K]>>
        : never

type Branches<T, TPool> =
    [ConditionKeys<T>] extends [never] ? {}
    : { [K in ConditionKeys<T>]: BranchArm<T, K, TPool> }[ConditionKeys<T>] | UnmatchedArm<T, TPool>

type InferBody<T, TPool> = ValuesAt<T> & Branches<T, TPool>

type Definitionof<D> = D extends { __definition?: infer TDef } ? Exclude<TDef, undefined> : never


export type InferFieldValues<D> = 0 extends (1 & D) ? any
    : [ConditionKeys<Definitionof<D>>] extends [never]
        // No condition keys — identical to the pre-derivatives behaviour.
        ? FlatFieldValues<D>
        // Base fields (incl. framework defaults) intersected with the branch union.
        : FlatFieldValues<D> & Branches<Definitionof<D>, FieldsAt<Definitionof<D>>>;

/**
 * Subset of InferFieldValues restricted to reconcile fields (marked via FieldBuilder.reconciling).
 * This is what a reconciler receives — it may only branch on reconcile fields, since those are the
 * only ones in the reconciled identity (createReconciledId). Reading any other field is a type error.
 */
export type InferReconcilingFieldValues<D> = 0 extends (1 & D) ? any
    : D extends { fields: infer T }
    ? T extends readonly { id: string }[]
    ? { [K in T[number]as K extends { reconcile: true }
        ? K extends { __literalId?: infer Id extends string }
        ? Id
        : K extends { id: infer Id extends string } ? Id : never
        : never
        ]: K extends { initialValue: infer IV } ? IV : any
    }
    : never
    : Record<string, never>;

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

type DerivedIncoming<TDef, TValues> =
    [ConditionKeys<TDef>] extends [never] ? {}
    : UnionToIntersection<{
        [K in ConditionKeys<TDef>]: ConditionHolds<TValues, K & string> extends true
            ? IncomingObject<TDef[K] extends { inputs: infer I } ? I : readonly []>
                & DerivedIncoming<TDef[K], TValues>
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
        : IncomingObject<T> & DerivedIncoming<Definitionof<D>, TValues>
    : never;

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

type DerivedOutputs<TDef, TValues> =
    [ConditionKeys<TDef>] extends [never] ? {}
    : UnionToIntersection<{
        [K in ConditionKeys<TDef>]: ConditionHolds<TValues, K & string> extends true
            ? OutputsObject<TDef[K] extends { outputs: infer O } ? O : readonly []>
                & DerivedOutputs<TDef[K], TValues>
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
        : OutputsObject<T> & DerivedOutputs<Definitionof<D>, TValues>
    : never;

/**
 * Decrypted field values for one credential template, keyed by field literal id.
 */
export type InferCredentialValues<C> = 0 extends (1 & C) ? any
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