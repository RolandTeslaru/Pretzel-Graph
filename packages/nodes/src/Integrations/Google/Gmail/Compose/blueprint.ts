import {
    defineBlueprint,
    defineTool,
    defineField,
    defineOutput,
} from "@pretzel-graph/node-sdk";
import { GoogleGmailOAuth } from "@pretzel-graph/nodes/Credentials/GoogleOAuth";


// The outbound half of Gmail: everything here can leave the account.
export const Blueprint = defineBlueprint({
    id:              "Integrations.Google.Gmail.Compose",
    credentials:     [GoogleGmailOAuth],
    displayName:     "Gmail Compose",
    description:     "Sends mail, or saves it as a draft, from the connected Gmail account.",
    icon:            "Gmail",
    accent:          "port-Data",
    proxyCompatible: true,
    toolCompatible:  true,

    fields: [
        defineField.MultiOption("deliver", "Deliver", {
            options: [
                { value: "send",  displayName: "Send",       description: "Send immediately."               },
                { value: "draft", displayName: "Save Draft", description: "Leave it in Drafts for review."  },
            ],
            initialValue: "send",
            variant:      "tab",
        }),
        defineField.String("to",      "To",      { required: true, placeholder: "a@example.com, b@example.com" }),
        defineField.String("cc",      "Cc"),
        defineField.String("bcc",     "Bcc"),
        defineField.String("subject", "Subject"),
        defineField.String("body",    "Body"),
        defineField.Boolean("bodyIsHtml", "Body is HTML", { initialValue: false }),
        defineField.String("threadId", "Thread ID", {
            tooltip: "Reply inside an existing conversation.",
        }),
        defineField.String("inReplyTo", "In Reply To", {
            tooltip: "The Message-ID header of the message being answered.",
        }),
    ],
    inputs:  [],
    outputs: [],


    "deliver==send": {
        outputs: [defineOutput.Data("result", "Result")],
    },

    "deliver==draft": {
        outputs: [defineOutput.Data("result", "Draft")],
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [defineOutput.ToolList("tools", "Gmail Compose Tools")],
    }),
});
