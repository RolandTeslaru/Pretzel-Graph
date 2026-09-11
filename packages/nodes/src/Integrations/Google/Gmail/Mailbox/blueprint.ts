import {
    defineBlueprint,
    defineTool,
    defineField,
    defineOutput,
} from "@pretzel-graph/node-sdk";
import { GoogleGmailOAuth } from "@pretzel-graph/nodes/Credentials/GoogleOAuth";


// Everything here stays inside the account: reads, and reversible mailbox state.
// Anything that leaves the account lives on Gmail.Compose.
export const Blueprint = defineBlueprint({
    id:              "Integrations.Google.Gmail.Mailbox",
    credentials:     [GoogleGmailOAuth],
    displayName:     "Gmail Mailbox",
    description:     "Reads, searches and organises mail in the connected Gmail account.",
    icon:            "Gmail",
    accent:          "port-Data",
    proxyCompatible: true,
    toolCompatible:  true,

    fields: [
        defineField.MultiOption("resource", "Resource", {
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
            defineField.String("query", "Query", {
                placeholder: "from:someone@example.com newer_than:7d",
                tooltip:     "Same syntax as the Gmail search box.",
            }),
            defineField.ResourceLoader("searchLabel", "Label", {
                loaderId:    "labels",
                placeholder: "Any label",
            }),
            defineField.Integer("maxResults", "Max Results", { initialValue: 20, min: 1, max: 100 }),
            defineField.Boolean("includeSpamTrash", "Include Spam & Trash", { initialValue: false }),
        ],
        outputs: [defineOutput.DataList("messages", "Messages")],
    },

    "resource==get": {
        fields: [
            defineField.String("messageId", "Message ID", { required: true }),
        ],
        outputs: [defineOutput.Data("message", "Message")],
    },

    "resource==modify": {
        fields: [
            defineField.String("modifyMessageId", "Message ID", { required: true }),
            defineField.ResourceLoader("addLabel", "Add Label", {
                loaderId:    "labels",
                placeholder: "None",
            }),
            defineField.ResourceLoader("removeLabel", "Remove Label", {
                loaderId:    "labels",
                placeholder: "None",
            }),
            defineField.MultiOption("readState", "Read State", {
                options: [
                    { value: "keep",   displayName: "Keep"        },
                    { value: "read",   displayName: "Mark Read"   },
                    { value: "unread", displayName: "Mark Unread" },
                ],
                initialValue: "keep",
            }),
            defineField.Boolean("archive", "Archive", {
                initialValue: false,
                tooltip:      "Removes the message from the inbox.",
            }),
        ],
        outputs: [defineOutput.Data("message", "Message")],
    },

    "resource==trash": {
        fields: [
            defineField.String("trashMessageId", "Message ID", { required: true }),
        ],
        outputs: [defineOutput.Data("message", "Message")],
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [defineOutput.ToolList("tools", "Gmail Mailbox Tools")],
    }),
});
