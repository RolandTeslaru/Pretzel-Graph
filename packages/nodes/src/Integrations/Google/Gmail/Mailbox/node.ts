import { RuntimeNode, defineLoaders, type InferOutputs } from "@pretzel-graph/node-sdk";

import { GoogleGmailClient, bareHTTP } from "../../client";
import { googleToken, loaderValue, optional } from "../../shared";
import { Blueprint } from "./blueprint";
import { buildTools } from "./tools";


export class Node extends RuntimeNode<typeof Blueprint> {

    static loaders = defineLoaders<typeof Blueprint>()({

        async labels({ credentials, credentialsAPI, searchQuery }) {
            const gmail = new GoogleGmailClient(bareHTTP(), googleToken(credentialsAPI, credentials.googleGmailOAuth, "Gmail Mailbox"));

            const { labels } = await gmail.labels.list();
            const q = searchQuery?.toLowerCase() ?? "";

            return {
                options: labels
                    .filter(l => !q || l.name.toLowerCase().includes(q))
                    .map(l => ({ label: l.name, value: l.id, description: l.type })),
            };
        },
    });


    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        const fields = this.fieldValues;
        const gmail  = this.gmail;

        if (fields.isConvertedToTool === true)
            return {
                tools: buildTools(gmail),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;

        switch (fields.resource) {

            case "search": {
                const label = loaderValue(fields.searchLabel);

                const { messages } = await gmail.messages.search({
                    q:                optional(fields.query),
                    maxResults:       fields.maxResults,
                    includeSpamTrash: fields.includeSpamTrash,
                    labelIds:         label ? [label] : undefined,
                });

                return { messages } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            case "get":
                return {
                    message: await gmail.messages.get({ id: fields.messageId }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "modify": {
                const add    = new Set<string>();
                const remove = new Set<string>();

                const addLabel    = loaderValue(fields.addLabel);
                const removeLabel = loaderValue(fields.removeLabel);

                if (addLabel)    add.add(addLabel);
                if (removeLabel) remove.add(removeLabel);
                if (fields.archive) remove.add("INBOX");
                if (fields.readState === "read")   remove.add("UNREAD");
                if (fields.readState === "unread") add.add("UNREAD");

                return {
                    message: await gmail.messages.modify({
                        id:             fields.modifyMessageId,
                        addLabelIds:    add.size    ? [...add]    : undefined,
                        removeLabelIds: remove.size ? [...remove] : undefined,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            case "trash":
                return {
                    message: await gmail.messages.trash({ id: fields.trashMessageId }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }

        return {};
    }


    #client: GoogleGmailClient | undefined;

    private get gmail(): GoogleGmailClient {
        this.#client ??= new GoogleGmailClient(
            this.httpClientFactory,
            googleToken(this.context.credentialsAPI, this.credentials.googleGmailOAuth, "Gmail Mailbox"),
        );

        return this.#client;
    }
}
