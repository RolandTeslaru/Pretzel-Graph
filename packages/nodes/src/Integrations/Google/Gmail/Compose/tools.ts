import { tool } from "@langchain/core/tools";
import { ToolBudget } from "@pretzel-graph/node-sdk";
import { z } from "zod/v3";

import type { GoogleGmailClient } from "../../client";


export function buildTools(gmail: GoogleGmailClient) {

    const send = tool(
        async ({ to, cc, bcc, subject, body, html, threadId, inReplyTo }) => {
            const result = await gmail.messages.send({
                to, cc, bcc, subject, threadId, inReplyTo,
                ...(html ? { html: body, text: body.replace(/<[^>]+>/g, " ") } : { text: body }),
            });

            return ToolBudget.value(result);
        },
        {
            name:        "gmail_send",
            description: "Send an email from the connected account. To reply in a thread, pass the original message's threadId and its messageId as inReplyTo.",
            schema: z.object({
                to:        z.array(z.string()).min(1).describe("Recipient addresses."),
                cc:        z.array(z.string()).optional(),
                bcc:       z.array(z.string()).optional(),
                subject:   z.string(),
                body:      z.string().describe("Message body. Plain text unless html is true."),
                html:      z.boolean().default(false),
                threadId:  z.string().optional(),
                inReplyTo: z.string().optional().describe("Message-ID header of the message being answered."),
            }),
        },
    );

    const draft = tool(
        async ({ to, cc, bcc, subject, body, threadId, inReplyTo }) => ToolBudget.value(
            await gmail.drafts.create({ to, cc, bcc, subject, text: body, threadId, inReplyTo }),
        ),
        {
            name:        "gmail_create_draft",
            description: "Save an email as a draft instead of sending it, so a person can review it first.",
            schema: z.object({
                to:        z.array(z.string()).min(1),
                cc:        z.array(z.string()).optional(),
                bcc:       z.array(z.string()).optional(),
                subject:   z.string(),
                body:      z.string(),
                threadId:  z.string().optional(),
                inReplyTo: z.string().optional(),
            }),
        },
    );

    return [send, draft];
}
