import { tool } from "@langchain/core/tools";
import { ToolBudget } from "@pretzel-graph/node-sdk";
import { z } from "zod/v3";

import type { GoogleDriveClient } from "../client";
import { Google } from "../domain";


const compact = (f: Google.Drive.File) => ({
    id:           f.id,
    name:         f.name,
    mimeType:     f.mimeType,
    size:         f.size,
    modifiedTime: f.modifiedTime,
    parents:      f.parents,
    url:          f.webViewLink,
});


export function buildTools(drive: GoogleDriveClient) {

    const search = tool(
        async ({ nameContains, folderId, mimeType, limit }) => {
            const q = [
                "trashed = false",
                ...(nameContains ? [`name contains ${Google.Drive.quote(nameContains)}`] : []),
                ...(folderId     ? [`${Google.Drive.quote(folderId)} in parents`]       : []),
                ...(mimeType     ? [`mimeType = ${Google.Drive.quote(mimeType)}`]        : []),
            ].join(" and ");

            const { files } = await drive.files.list({ q, pageSize: limit });

            return ToolBudget.list("files", files.map(compact), { hint: "Add a name or folder filter." });
        },
        {
            name:        "drive_search_files",
            description: "Find files and folders in Google Drive. Folders have mimeType application/vnd.google-apps.folder; Google Docs …document; Sheets …spreadsheet.",
            schema: z.object({
                nameContains: z.string().optional(),
                folderId:     z.string().optional().describe("Only direct children of this folder."),
                mimeType:     z.string().optional(),
                limit:        z.number().int().min(1).max(100).default(20),
            }),
        },
    );

    const get = tool(
        async ({ fileId }) => ToolBudget.value(await drive.files.get({ fileId })),
        {
            name:        "drive_get_file",
            description: "Metadata for one file: name, type, size, parents, link.",
            schema: z.object({ fileId: z.string() }),
        },
    );

    const read = tool(
        async ({ fileId, exportMimeType }) => {
            const content = await drive.files.readText({ fileId, exportMimeType });

            return ToolBudget.value({ file: compact(content.file), mimeType: content.mimeType, text: content.text });
        },
        {
            name:        "drive_read_file",
            description: "Read a text file's content. Google Docs come back as Markdown, Sheets as CSV, Slides as plain text. Binary files cannot be read.",
            schema: z.object({
                fileId:         z.string(),
                exportMimeType: z.string().optional().describe("For Google-native files only, e.g. text/plain or text/csv."),
            }),
        },
    );

    const createFolder = tool(
        async ({ name, parentId }) => ToolBudget.value(compact(await drive.files.createFolder({ name, parentId }))),
        {
            name:        "drive_create_folder",
            description: "Create a folder, optionally inside another folder.",
            schema: z.object({
                name:     z.string(),
                parentId: z.string().optional(),
            }),
        },
    );

    const move = tool(
        async ({ fileId, folderId }) => ToolBudget.value(compact(await drive.files.move({ fileId, parentId: folderId }))),
        {
            name:        "drive_move_file",
            description: "Move a file or folder into another folder.",
            schema: z.object({
                fileId:   z.string(),
                folderId: z.string(),
            }),
        },
    );

    return [search, get, read, createFolder, move];
}
