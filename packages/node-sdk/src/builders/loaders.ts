import type { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import type { Foundations, Vault } from "@pretzel-graph/shared/domain";
import type { InferCredentials, InferCredentialValues, InferFieldValues } from "../types";

export namespace Loader {
    export type Result = {
        options: Foundations.Field.ResourceLoader.OptionItem[];
        nextPaginationCursor?: string;
    };

    export type Context<T_Blueprint extends Blueprint = Blueprint> = {
        fieldValues: InferFieldValues<T_Blueprint>;
        credentials: InferCredentials<T_Blueprint>;
        credentialsAPI: {
            getInstance(instanceId: Vault.Credential.Instance.Id): Vault.Credential.Instance | undefined;
            getDecryptedValue<T = unknown>(blob: Vault.Credential.Instance.EncryptedBlob<T>): InferCredentialValues<T>;
        };
        searchQuery?: string;
        paginationCursor?: string;
    };

    export type Fn<T_Blueprint extends Blueprint = Blueprint> =
        (context: Context<T_Blueprint>) => Promise<Result>;
}

/**
 * Binds a blueprint type, then infers the concrete loaders map so each loader's
 * context (`fieldValues`, `credentials`) is typed against that blueprint.
 *
 * Curried because static members cannot reference a class type parameter, so the
 * blueprint must be supplied explicitly at the declaration site.
 *
 * @example
 * static loaders = defineLoaders<typeof Blueprint>()({
 *     tableSearch: async ({ fieldValues, searchQuery }) => { ... },
 * });
 */
export function defineLoaders<T_Blueprint extends Blueprint>() {
    return <T extends Record<string, Loader.Fn<T_Blueprint>>>(loaders: T): T => loaders;
}
