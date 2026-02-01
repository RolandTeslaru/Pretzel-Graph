import { z } from "zod"

export namespace Vault {
    export namespace Credential {
        export const Id = z.string().brand("credentialId");
        export type Id = z.infer<typeof Id>

        export const Schema = z.object({
            id: z.string().brand("credentialId"),
            name: z.string(),
            provider: z.string(),
            created_at: z.string(),
        })
    }
    export type Credential = z.infer<typeof Credential.Schema>

    export const Secret = z.string().brand("SECRET_CREDENTIAL_DO_NOT_STORE")

    export type Secret = z.infer<typeof Secret>
}