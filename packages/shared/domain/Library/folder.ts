import { z } from "zod"

export namespace Folder {
    export const Id = z.uuid().brand("FolderId")
    export type Id = z.infer<typeof Folder.Id>

    // Seeded at install. Every other folder and workflow descends from it.
    export const ROOT_ID = Folder.Id.parse("00000000-0000-4000-8000-000000000001")

    export const Schema = z.object({
        id: Folder.Id,
        parent_folder_id: Folder.Id.nullable(),
        display_name: z.string(),
        description: z.string().nullable(),
        hidden: z.boolean().nullable().optional(),
        created_at: z.string(),
        updated_at: z.string(),
    })
}
export type Folder = z.infer<typeof Folder.Schema>
