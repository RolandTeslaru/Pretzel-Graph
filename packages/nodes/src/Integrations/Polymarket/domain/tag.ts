import { z } from "zod"

import { Gamma } from "./Gamma"

/** A topic label. Gamma carries publishing metadata on these; only the label is worth keeping. */
export namespace Tag {

    export const Schema = z.object({
        id:    z.string().nullable(),
        label: z.string().nullable(),
        slug:  z.string().nullable(),
    })

    export const fromGamma = (tag: Gamma.Tag): Tag => ({
        id:    tag.id    ?? null,
        label: tag.label ?? null,
        slug:  tag.slug  ?? null,
    })
}

export type Tag = z.infer<typeof Tag.Schema>
