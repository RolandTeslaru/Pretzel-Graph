import { z } from "zod"
import { SkillId, FolderId } from "./ids"

export namespace Skill {
    export const Id = SkillId
    export type Id = SkillId

    export const DEFAULT_ICON = "Sparkles2"
    export const DEFAULT_ACCENT = "port-Skill"

    // Lowercase letters, digits and hyphens; the name the model calls the skill by.
    export const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
    export const Name = z.string().max(64).regex(NAME_PATTERN)

    export const Schema = z.object({
        id:           Skill.Id,
        folder_id:    FolderId,
        name:         Skill.Name,
        description:  z.string().max(1024),
        content:      z.string(),
        content_hash: z.string(),
        icon:         z.string().nullable(),
        accent:       z.string().nullable(),
        created_by:   z.uuid().nullable(),
        created_at:   z.string(),
        updated_at:   z.string(),
    })

    // Library listing rows: everything but the body.
    export namespace Meta {
        export const Schema = Skill.Schema.omit({ content: true })
    }
    export type Meta = z.infer<typeof Meta.Schema>
}
export type Skill = z.infer<typeof Skill.Schema>
