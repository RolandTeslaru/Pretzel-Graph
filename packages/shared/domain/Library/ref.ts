import { z } from "zod"
import { ConnectionId, FolderId, SkillId, WorkflowId } from "../Workflow/ids"

// A live pointer at something the library browses. Unlike Dependency.Ref nothing is
// snapshotted: the target keeps changing, and deleting it affects whoever points at it.
export namespace Ref {
    export namespace Workflow {
        export const Schema = z.object({
            kind: z.literal("workflow"),
            id:   WorkflowId,
        })
    }
    export namespace Folder {
        export const Schema = z.object({
            kind: z.literal("folder"),
            id:   FolderId,
        })
    }
    export namespace Skill {
        export const Schema = z.object({
            kind: z.literal("skill"),
            id:   SkillId,
        })
    }
    export namespace Connection {
        export const Schema = z.object({
            kind: z.literal("connection"),
            id:   ConnectionId,
        })
    }

    export const Kind = z.enum(["workflow", "folder", "skill", "connection"])
    export type Kind = z.infer<typeof Kind>

    export type Workflow   = z.infer<typeof Workflow.Schema>
    export type Folder     = z.infer<typeof Folder.Schema>
    export type Skill      = z.infer<typeof Skill.Schema>
    export type Connection = z.infer<typeof Connection.Schema>

    export const Schema = z.discriminatedUnion("kind", [
        Workflow.Schema,
        Folder.Schema,
        Skill.Schema,
        Connection.Schema,
    ])
}
export type Ref = z.infer<typeof Ref.Schema>
