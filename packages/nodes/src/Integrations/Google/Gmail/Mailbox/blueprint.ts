import {
    defineBlueprint,
    defineTool,
    FieldBuilder,
    OutputBuilder,
} from "@pretzel-graph/node-sdk";
import { GoogleGmailOAuth } from "@pretzel-graph/nodes/Credentials/GoogleOAuth";


// Everything here stays inside the account: reads, and reversible mailbox state.
// Anything that leaves the account lives on Gmail.Compose.
export const Blueprint = defineBlueprint({
    id:              "Integrations.Google.Gmail.Mailbox",
    credentials:     [GoogleGmailOAuth],
    displayName:     "Gmail Mailbox",
    description:     "Reads, searches and organises mail in the connected Gmail account.",
    icon:            "Google",
    accent:          "port-Data",
    proxyCompatible: true,
    toolCompatible:  true,

    fields: [
        FieldBuilder.MultiOption("resource", "Resource", {
            options: [
                { value: "search", displayName: "Search", description: "Find messages with a Gmail search query."          },
                { value: "get",    displayName: "Get",    description: "One message by id, with its body and attachments." },
                { value: "modify", displayName: "Modify", description: "Add or remove labels, archive, mark read."         },
                { value: "trash",  displayName: "Trash",  description: "Move a message to the trash."                      },
            ],
            initialValue: "search",
        }),
    ],
    inputs:  [],
    outputs: [],


    "resource==search": {
        fields: [
            FieldBuilder.String("query", "Query", {
                placeholder: "from:someone@example.com newer_than:7d",
                tooltip:     "Same syntax as the Gmail search box.",
            }),
            FieldBuilder.ResourceLoader("searchLabel", "Label", {
                loaderId:    "labels",
                placeholder: "Any label",
            }),
            FieldBuilder.Integer("maxResults", "Max Results", { initialValue: 20, min: 1, max: 100 }),
            FieldBuilder.Boolean("includeSpamTrash", "Include Spam & Trash", { initialValue: false }),
        ],
        outputs: [OutputBuilder.DataList("messages", "Messages")],
    },

    "resource==get": {
        fields: [
            FieldBuilder.String("messageId", "Message ID", { required: true }),
        ],
        outputs: [OutputBuilder.Data("message", "Message")],
    },

    "resource==modify": {
        fields: [
            FieldBuilder.String("modifyMessageId", "Message ID", { required: true }),
            FieldBuilder.ResourceLoader("addLabel", "Add Label", {
                loaderId:    "labels",
                placeholder: "None",
            }),
            FieldBuilder.ResourceLoader("removeLabel", "Remove Label", {
                loaderId:    "labels",
                placeholder: "None",
            }),
            FieldBuilder.MultiOption("readState", "Read State", {
                options: [
                    { value: "keep",   displayName: "Keep"        },
                    { value: "read",   displayName: "Mark Read"   },
                    { value: "unread", displayName: "Mark Unread" },
                ],
                initialValue: "keep",
            }),
            FieldBuilder.Boolean("archive", "Archive", {
                initialValue: false,
                tooltip:      "Removes the message from the inbox.",
            }),
        ],
        outputs: [OutputBuilder.Data("message", "Message")],
    },

    "resource==trash": {
        fields: [
            FieldBuilder.String("trashMessageId", "Message ID", { required: true }),
        ],
        outputs: [OutputBuilder.Data("message", "Message")],
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [OutputBuilder.ToolList("tools", "Gmail Mailbox Tools")],
    }),
});
