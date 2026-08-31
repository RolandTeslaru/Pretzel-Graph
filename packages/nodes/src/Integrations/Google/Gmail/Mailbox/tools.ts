import { tool } from "@langchain/core/tools";
import { ToolBudget } from "@pretzel-graph/node-sdk";
import { z } from "zod/v3";

import type { GoogleGmailClient } from "../../client";


// Nothing in this set can send mail or address a third party.
export function buildTools(gmail: GoogleGmailClient) {

    const search = tool(
        async ({ query, maxResults, labelIds }) => {
            const { messages } = await gmail.messages.search({ q: query, maxResults, labelIds });

            const compact = messages.map(m => ({
                id:          m.id,
                threadId:    m.threadId,
                date:        m.date,
                from:        m.from,
                to:          m.to,
                subject:     m.subject,
                snippet:     m.snippet,
                labelIds:    m.labelIds,
                attachments: m.attachments.map(a => a.filename),
            }));

            return ToolBudget.list("messages", compact, { hint: "Narrow the query or lower maxResults." });
        },
        {
            name:        "gmail_search",
            description: "Search the mailbox with Gmail query syntax (from:, to:, subject:, newer_than:7d, has:attachment, is:unread, label:…). Returns headers and a snippet per message; use gmail_get_message for the full body.",
            schema: z.object({
                query:      z.string().optional().describe("Gmail search query. Omit for the most recent messages."),
                maxResults: z.number().int().min(1).max(50).default(10),
                labelIds:   z.array(z.string()).optional().describe("Restrict to these label ids, e.g. INBOX, UNREAD, STARRED."),
            }),
        },
    );

    const getMessage = tool(
        async ({ messageId }) => ToolBudget.value(await gmail.messages.get({ id: messageId })),
        {
            name:        "gmail_get_message",
            description: "Read one message in full: headers, decoded text body, and the list of attachments.",
            schema: z.object({
                messageId: z.string().describe("The message id from gmail_search."),
            }),
        },
    );

    const modify = tool(
        async ({ messageId, addLabelIds, removeLabelIds }) => ToolBudget.value(
            await gmail.messages.modify({ id: messageId, addLabelIds, removeLabelIds }),
        ),
        {
            name:        "gmail_modify_labels",
            description: "Add or remove labels on a message. Remove INBOX to archive, remove UNREAD to mark read, add STARRED to star.",
            schema: z.object({
                messageId:      z.string(),
                addLabelIds:    z.array(z.string()).optional(),
                removeLabelIds: z.array(z.string()).optional(),
            }),
        },
    );

    const listLabels = tool(
        async () => {
            const { labels } = await gmail.labels.list();

            return ToolBudget.list("labels", labels.map(l => ({ id: l.id, name: l.name, type: l.type })));
        },
        {
            name:        "gmail_list_labels",
            description: "List the mailbox's labels with their ids, for use in search and modify.",
            schema: z.object({}),
        },
    );

    return [search, getMessage, modify, listLabels];
}
