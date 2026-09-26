import { tool } from "@langchain/core/tools";
import { ToolBudget, type HTTP } from "@pretzel-graph/node-sdk";
import { Library } from "@pretzel-graph/shared/domain";
import { z } from "zod/v3";


export function buildTools(api: HTTP.Client) {

    const query = tool(
        async ({ kinds, displayName, folderIds, limit }) => {
            const { items, total } = await Library.API.Internal.query(api.raw, {
                kinds,
                displayName,
                folderIds: folderIds as Library.Folder.Id[] | undefined,
                limit,
            });

            return ToolBudget.list("items", items.map(item => ({
                ref:        { kind: item.kind, id: item.id },
                name:       item.name,
                folderId:   item.folder_id,
                folderName: item.folder_name,
                updatedAt:  item.updated_at,
                ...(item.description   ? { description: item.description }     : {}),
                ...(item.hidden        ? { hidden: true }                       : {}),
                ...(item.definition_id ? { definitionId: item.definition_id }   : {}),
                ...(item.status        ? { status: item.status }                : {}),
            })), { hint: total > items.length ? `${total} matched; ${items.length} returned. Narrow the query or raise limit.` : undefined });
        },
        {
            name:        "library_query",
            description: "Find what is saved in this workspace's library: workflows, folders, skills and connections, most recently changed first. Filters combine; omit all to list everything. Each item's ref is the value a field of the LibraryRef kind takes. Connections carry the definitionId a field may require. Read-only.",
            schema: z.object({
                kinds:       z.array(z.enum(["workflow", "folder", "skill", "connection"])).optional(),
                displayName: z.string().optional().describe("Case-insensitive substring of the name."),
                folderIds:   z.array(z.string()).optional().describe("Only items directly in these folders."),
                limit:       z.number().int().positive().max(500).optional().describe("Default 50."),
            }),
        },
    );


    return [query];
}
