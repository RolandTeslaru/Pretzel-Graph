import { z } from "zod"
import type { AxiosInstance } from "axios"

export namespace Release {

    // A version such as 0.0.740.
    export const Version = z.string().regex(/^\d+\.\d+\.\d+$/)
    export type  Version = z.infer<typeof Version>

    // Whether `candidate` is a later version than `current`.
    export function isNewer(candidate: Version, current: Version): boolean {
        const candidateParts = candidate.split(".").map(Number)
        const currentParts   = current.split(".").map(Number)

        for (let index = 0; index < candidateParts.length; index++) {
            if (candidateParts[index] !== currentParts[index])
                return candidateParts[index] > currentParts[index]
        }

        return false
    }

    export namespace API {

        export namespace Update {
            export const Response = z.object({
                current:   z.string(),
                // Null when this version is the latest, or the check is off.
                available: Version.nullable(),
            })
            export type Response = z.infer<typeof Response>
        }

        export async function getUpdate(api: AxiosInstance): Promise<Update.Response> {
            const { data } = await api.get("/api/release/update")
            return Update.Response.parse(data)
        }
    }
}
