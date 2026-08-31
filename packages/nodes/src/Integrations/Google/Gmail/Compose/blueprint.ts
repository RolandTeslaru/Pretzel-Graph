import {
    defineBlueprint,
    defineTool,
    FieldBuilder,
    OutputBuilder,
} from "@pretzel-graph/node-sdk";
import { GoogleGmailOAuth } from "@pretzel-graph/nodes/Credentials/GoogleOAuth";


// The outbound half of Gmail: everything here can leave the account.
export const Blueprint = defineBlueprint({
    id:              "Integrations.Google.Gmail.Compose",
    credentials:     [GoogleGmailOAuth],
    displayName:     "Gmail Compose",
    description:     "Sends mail, or saves it as a draft, from the connected Gmail account.",
    icon:            "Google",
    accent:          "port-Data",
    proxyCompatible: true,
    toolCompatible:  true,

    fields: [
        FieldBuilder.MultiOption("deliver", "Deliver", {
            options: [
                { value: "send",  displayName: "Send",       description: "Send immediately."               },
                { value: "draft", displayName: "Save Draft", description: "Leave it in Drafts for review."  },
            ],
            initialValue: "send",
            variant:      "tab",
        }),
        FieldBuilder.String("to",      "To",      { required: true, placeholder: "a@example.com, b@example.com" }),
        FieldBuilder.String("cc",      "Cc"),
        FieldBuilder.String("bcc",     "Bcc"),
        FieldBuilder.String("subject", "Subject"),
        FieldBuilder.String("body",    "Body"),
        FieldBuilder.Boolean("bodyIsHtml", "Body is HTML", { initialValue: false }),
        FieldBuilder.String("threadId", "Thread ID", {
            tooltip: "Reply inside an existing conversation.",
        }),
        FieldBuilder.String("inReplyTo", "In Reply To", {
            tooltip: "The Message-ID header of the message being answered.",
        }),
    ],
    inputs:  [],
    outputs: [],


    "deliver==send": {
        outputs: [OutputBuilder.Data("result", "Result")],
    },

    "deliver==draft": {
        outputs: [OutputBuilder.Data("result", "Draft")],
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [OutputBuilder.ToolList("tools", "Gmail Compose Tools")],
    }),
});
