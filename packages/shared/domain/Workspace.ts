import z from "zod";

export namespace Workspace {
    export const Id = z.string().brand("WorkspaceId")
    export type Id = z.infer<typeof Id>
}