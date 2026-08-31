import {
    defineBlueprint,
    defineTool,
    FieldBuilder,
    OutputBuilder,
} from "@pretzel-graph/node-sdk";
import { GoogleDriveOAuth } from "@pretzel-graph/nodes/Credentials/GoogleOAuth";


export const Blueprint = defineBlueprint({
    id:              "Integrations.Google.Drive",
    credentials:     [GoogleDriveOAuth],
    displayName:     "Google Drive",
    description:     "Finds, reads, uploads and organises files in the connected Google Drive.",
    icon:            "Google",
    accent:          "port-Data",
    proxyCompatible: true,
    toolCompatible:  true,

    fields: [
        FieldBuilder.MultiOption("resource", "Resource", {
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
            FieldBuilder.String("nameContains", "Name Contains"),
            FieldBuilder.ResourceLoader("folder", "In Folder", { loaderId: "folders", placeholder: "Anywhere" }),
            FieldBuilder.String("mimeType", "MIME Type", {
                placeholder: "application/pdf",
                tooltip:     "Exact type. Google Docs are application/vnd.google-apps.document, Sheets …spreadsheet.",
            }),
            FieldBuilder.Boolean("includeTrashed", "Include Trashed", { initialValue: false }),
            FieldBuilder.Integer("limit", "Limit", { initialValue: 50, min: 1, max: 1000 }),
        ],
        outputs: [OutputBuilder.DataList("files", "Files")],
    },

    "resource==get": {
        fields: [
            FieldBuilder.String("fileId", "File ID", { required: true }),
        ],
        outputs: [OutputBuilder.Data("file", "File")],
    },

    "resource==readText": {
        fields: [
            FieldBuilder.String("readFileId", "File ID", { required: true }),
            FieldBuilder.String("exportMimeType", "Export As", {
                placeholder: "text/markdown",
                tooltip:     "Only for Google Docs, Sheets and Slides. Docs default to Markdown, Sheets to CSV, Slides to plain text.",
            }),
        ],
        outputs: [OutputBuilder.Data("content", "Content")],
    },

    "resource==createFolder": {
        fields: [
            FieldBuilder.String("folderName", "Folder Name", { required: true }),
            FieldBuilder.ResourceLoader("parentFolder", "Parent Folder", { loaderId: "folders", placeholder: "My Drive root" }),
        ],
        outputs: [OutputBuilder.Data("folder", "Folder")],
    },

    "resource==move": {
        fields: [
            FieldBuilder.String("moveFileId", "File ID", { required: true }),
            FieldBuilder.ResourceLoader("destinationFolder", "Destination Folder", { loaderId: "folders", placeholder: "Pick a folder", required: true }),
        ],
        outputs: [OutputBuilder.Data("file", "File")],
    },

    "resource==share": {
        fields: [
            FieldBuilder.String("shareFileId", "File ID", { required: true }),
            FieldBuilder.MultiOption("shareType", "Share With", {
                options: [
                    { value: "user",   displayName: "Person",  description: "One Google account."       },
                    { value: "group",  displayName: "Group",   description: "A Google Group address."   },
                    { value: "domain", displayName: "Domain",  description: "Everyone in a domain."     },
                    { value: "anyone", displayName: "Anyone",  description: "Anyone with the link."     },
                ],
                initialValue: "user",
            }),
            FieldBuilder.String("shareWith", "Email or Domain", {
                tooltip: "Not needed when sharing with anyone.",
            }),
            FieldBuilder.MultiOption("shareRole", "Role", {
                options: [
                    { value: "reader",    displayName: "Viewer"    },
                    { value: "commenter", displayName: "Commenter" },
                    { value: "writer",    displayName: "Editor"    },
                ],
                initialValue: "reader",
            }),
            FieldBuilder.Boolean("notify", "Send Notification Email", { initialValue: false }),
        ],
        outputs: [OutputBuilder.Data("permission", "Permission")],
    },

    "resource==trash": {
        fields: [
            FieldBuilder.String("trashFileId", "File ID", { required: true }),
        ],
        outputs: [OutputBuilder.Data("file", "File")],
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [OutputBuilder.ToolList("tools", "Google Drive Tools")],
    }),
});
