import type { Vault } from "@pretzel-graph/shared/domain"

/**
 * Infer static config values from a Blueprint.
 * 
 * Uses __literalId phantom for literal key names.
 * Maps each config field to its initialValue type.
 */
export type InferFieldValues<D> = 0 extends (1 & D) ? any
    : D extends { fields: infer T }
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

export type InferInputs<D> = 0 extends (1 & D) ? any
    : D extends { inputs: infer T }
    ? T extends readonly { id: string }[]
    ? { [K in keyof _InferInputsRaw<T>]: _InferInputsRaw<T>[K] }
    : never
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

export type InferOutputs<D> = 0 extends (1 & D) ? any
    : D extends { outputs: infer T }
    ? T extends readonly { id: string }[]
    ? { [K in T[number]as K extends { __literalId?: infer Id extends string }
        ? Id
        : K extends { id: infer Id extends string } ? Id : never
        ]: K extends { __reference?: infer V }
        ? [NonNullable<V>] extends [never]
        ? any
        : NonNullable<V>
        : any
    }
    : never
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