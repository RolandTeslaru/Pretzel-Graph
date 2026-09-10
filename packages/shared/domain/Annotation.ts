import { z } from "zod"

export namespace Annotation {
    export const Id = z.string().brand("AnnotationId")
    export type Id = z.infer<typeof Id>

    export type Kind = z.infer<typeof Schema>["kind"]

    export function createId(kind: Kind) {
        return `${kind}-${Math.random().toString(36).substring(2, 7)}` as Annotation.Id
    }

    // Fields shared by every annotation kind.
    const Base = z.object({
        id: Annotation.Id,
    })

    export namespace Note {
        export const Id = Annotation.Id.brand("NoteId")
        export type Id = z.infer<typeof Id>

        export function createId() {
            return Annotation.createId("note") as Note.Id
        }

        export const Schema = Base.extend({
            id:       Note.Id,
            kind:     z.literal("note"),
            text:     z.string(),
            position: z.object({ x: z.number(), y: z.number() }),
            size:     z.object({ width: z.number(), height: z.number() }),
            accent:   z.string().optional(),
        })

        export const DEFAULT_SIZE = { width: 250, height: 150 }
    }
    export type Note = z.infer<typeof Note.Schema>

    export const Schema = z.discriminatedUnion("kind", [
        Note.Schema,
    ])
}
export type Annotation = z.infer<typeof Annotation.Schema>
