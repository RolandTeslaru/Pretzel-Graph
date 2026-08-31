import { RuntimeNode, type InferOutputs } from "@pretzel-graph/node-sdk";

import { GoogleGmailClient } from "../../client";
import { googleToken, optional } from "../../shared";
import { Blueprint } from "./blueprint";
import { buildTools } from "./tools";


export class Node extends RuntimeNode<typeof Blueprint> {

    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        const fields = this.fieldValues;
        const gmail  = this.gmail;

        if (fields.isConvertedToTool === true)
            return {
                tools: buildTools(gmail),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;

        const outgoing = {
            to:        fields.to,
            cc:        optional(fields.cc),
            bcc:       optional(fields.bcc),
            subject:   fields.subject ?? "",
            threadId:  optional(fields.threadId),
            inReplyTo: optional(fields.inReplyTo),
            ...(fields.bodyIsHtml
                ? { html: fields.body ?? "", text: (fields.body ?? "").replace(/<[^>]+>/g, " ") }
                : { text: fields.body ?? "" }),
        };

        const result = fields.deliver === "draft"
            ? await gmail.drafts.create(outgoing)
            : await gmail.messages.send(outgoing);

        return { result } satisfies InferOutputs<typeof Blueprint, typeof fields>;
    }


    #client: GoogleGmailClient | undefined;

    private get gmail(): GoogleGmailClient {
        this.#client ??= new GoogleGmailClient(
            this.httpClientFactory,
            googleToken(this.context.credentialsAPI, this.credentials.googleGmailOAuth, "Gmail Compose"),
        );

        return this.#client;
    }
}
