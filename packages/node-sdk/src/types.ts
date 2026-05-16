import type { Vault } from "@pretzel-graph/shared/domain"

/**
 * Infer static config values from a Blueprint.
 * 
 * Uses __literalId phantom for literal key names.
 * Maps each config field to its initialValue type.
 */
export type InferFields<D> = 0 extends (1 & D) ? any
    : D extends { fields: infer T }
    ? T extends readonly { id: string }[]
    ? { [K in T[number]as K extends { __literalId?: infer Id extends string }
        ? Id
        : K extends { id: infer Id extends string } ? Id : never
        ]: K extends { initialValue: infer IV } ? IV : any
    }
    : never
    : Record<string, never>;

/**
 * Like InferFields, but only includes fields where initialValue was
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
 */
export type InferInputs<D> = 0 extends (1 & D) ? any
    : D extends { inputs: infer T }
    ? T extends readonly { id: string }[]
    ? { [K in T[number]as K extends { __literalId?: infer Id extends string }
        ? Id
        : K extends { id: infer Id extends string } ? Id : never
        ]: K extends { __reference?: infer V }
        ? [NonNullable<V>] extends [never]
        ? (K extends { initialValue: infer IV } ? IV : any)
        : NonNullable<V>
        : K extends { initialValue: infer IV } ? IV : any
    }
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
        ]: string
      }
    : Record<string, string>
    : Record<string, string>;

/**
 * Infer credential instances from a Blueprint, keyed by credential template id.
 * Each value is the resolved Vault.Credential.Instance at runtime, with its
 * `blob` phantom-branded with the template type so that
 * `context.getDecryptedCredentialValues(instance.blob)` returns a typed record.
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