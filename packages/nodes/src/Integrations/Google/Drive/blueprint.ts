import {
    defineBlueprint,
    defineTool,
    defineField,
    defineOutput,
} from "@pretzel-graph/node-sdk";
import { GoogleDriveOAuth } from "@pretzel-graph/nodes/Credentials/GoogleOAuth";


export const Blueprint = defineBlueprint({
    id:              "Integrations.Google.Drive",
    credentials:     [GoogleDriveOAuth],
    displayName:     "Google Drive",
    description:     "Finds, reads, uploads and organises files in the connected Google Drive.",
    icon:            "GoogleDrive",
    accent:          "port-Data",
    proxyCompatible: true,
    toolCompatible:  true,

    fields: [
        defineField.MultiOption("resource", "Resource", {
            options: [
                { value: "search",       displayName: "Search",        description: "Find files by name, type or folder."                    },
                { value: "get",          displayName: "Get",           description: "Metadata of one file."                                   },
                { value: "readText",     displayName: "Read Text",     description: "Read a text file. Google Docs are exported as Markdown." },
                { value: "createFolder", displayName: "Create Folder", description: "Create a folder."                                        },
                { value: "move",         displayName: "Move",          description: "Move a file into another folder."                        },
                { value: "share",        displayName: "Share",         description: "Grant someone access to a file."                         },
                { value: "trash",        displayName: "Trash",         description: "Move a file to the trash."                               },
            ],
            initialValue: "search",
        }),
    ],
    inputs:  [],
    outputs: [],


    "resource==search": {
        fields: [
            defineField.String("nameContains", "Name Contains"),
            defineField.ResourceLoader("folder", "In Folder", { loaderId: "folders", placeholder: "Anywhere" }),
            defineField.String("mimeType", "MIME Type", {
                placeholder: "application/pdf",
                tooltip:     "Exact type. Google Docs are application/vnd.google-apps.document, Sheets …spreadsheet.",
            }),
            defineField.Boolean("includeTrashed", "Include Trashed", { initialValue: false }),
            defineField.Integer("limit", "Limit", { initialValue: 50, min: 1, max: 1000 }),
        ],
        outputs: [defineOutput.DataList("files", "Files")],
    },

    "resource==get": {
        fields: [
            defineField.String("fileId", "File ID", { required: true }),
        ],
        outputs: [defineOutput.Data("file", "File")],
    },

    "resource==readText": {
        fields: [
            defineField.String("readFileId", "File ID", { required: true }),
            defineField.String("exportMimeType", "Export As", {
                placeholder: "text/markdown",
                tooltip:     "Only for Google Docs, Sheets and Slides. Docs default to Markdown, Sheets to CSV, Slides to plain text.",
            }),
        ],
        outputs: [defineOutput.Data("content", "Content")],
    },

    "resource==createFolder": {
        fields: [
            defineField.String("folderName", "Folder Name", { required: true }),
            defineField.ResourceLoader("parentFolder", "Parent Folder", { loaderId: "folders", placeholder: "My Drive root" }),
        ],
        outputs: [defineOutput.Data("folder", "Folder")],
    },

    "resource==move": {
        fields: [
            defineField.String("moveFileId", "File ID", { required: true }),
            defineField.ResourceLoader("destinationFolder", "Destination Folder", { loaderId: "folders", placeholder: "Pick a folder", required: true }),
        ],
        outputs: [defineOutput.Data("file", "File")],
    },

    "resource==share": {
        fields: [
            defineField.String("shareFileId", "File ID", { required: true }),
            defineField.MultiOption("shareType", "Share With", {
                options: [
                    { value: "user",   displayName: "Person",  description: "One Google account."       },
                    { value: "group",  displayName: "Group",   description: "A Google Group address."   },
                    { value: "domain", displayName: "Domain",  description: "Everyone in a domain."     },
                    { value: "anyone", displayName: "Anyone",  description: "Anyone with the link."     },
                ],
                initialValue: "user",
            }),
            defineField.String("shareWith", "Email or Domain", {
                tooltip: "Not needed when sharing with anyone.",
            }),
            defineField.MultiOption("shareRole", "Role", {
                options: [
                    { value: "reader",    displayName: "Viewer"    },
                    { value: "commenter", displayName: "Commenter" },
                    { value: "writer",    displayName: "Editor"    },
                ],
                initialValue: "reader",
            }),
            defineField.Boolean("notify", "Send Notification Email", { initialValue: false }),
        ],
        outputs: [defineOutput.Data("permission", "Permission")],
    },

    "resource==trash": {
        fields: [
            defineField.String("trashFileId", "File ID", { required: true }),
        ],
        outputs: [defineOutput.Data("file", "File")],
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [defineOutput.ToolList("tools", "Google Drive Tools")],
    }),
});
