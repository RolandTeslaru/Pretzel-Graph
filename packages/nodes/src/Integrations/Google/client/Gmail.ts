import type { HTTP } from "@pretzel-graph/node-sdk"

import { withAPIParsing } from "../../../utils"
import { Google } from "../domain"
import { GoogleClient, encodeSegment, type AccessTokenGetter } from "./common"

export const GMAIL_BASE_URL = "https://gmail.googleapis.com/gmail/v1"

const Gmail = Google.Gmail

export class GoogleGmailClient extends GoogleClient {

    constructor(http: HTTP.ClientAPI, getToken: AccessTokenGetter) {
        super(http, GMAIL_BASE_URL, getToken)
    }

    public readonly messages = {
        // The list endpoint returns ids only, so each hit is fetched in full.
        search: withAPIParsing(
            Gmail.API.Messages.Search.Request,
            Gmail.API.Messages.Search.Response,
            async ({ labelIds, ...query }) => {
                const page = await this.get("/users/me/messages", {
                    ...query,
                    ...(labelIds?.length ? { labelIds: labelIds.join(",") } : {}),
                }) as { messages?: { id: string }[], nextPageToken?: string }

                const messages = await Promise.all(
                    (page.messages ?? []).map(({ id }) => this.fetchMessage(id)),
                )

                return { messages, nextPageToken: page.nextPageToken }
            },
        ),

        get: withAPIParsing(
            Gmail.API.Messages.Get.Request,
            Gmail.API.Messages.Get.Response,
            ({ id }) => this.fetchMessage(id),
        ),

        send: withAPIParsing(
            Gmail.API.Messages.Send.Request,
            Gmail.API.Messages.Send.Response,
            (outgoing) => this.post("/users/me/messages/send", {
                raw: Gmail.buildRawMessage(outgoing),
                ...(outgoing.threadId ? { threadId: outgoing.threadId } : {}),
            }),
        ),

        modify: withAPIParsing(
            Gmail.API.Messages.Modify.Request,
            Gmail.API.Messages.Modify.Response,
            ({ id, ...body }) => this.post(`/users/me/messages/${encodeSegment(id)}/modify`, body),
        ),

        trash: withAPIParsing(
            Gmail.API.Messages.Trash.Request,
            Gmail.API.Messages.Trash.Response,
            ({ id }) => this.post(`/users/me/messages/${encodeSegment(id)}/trash`),
        ),
    }

    public readonly drafts = {
        create: withAPIParsing(
            Gmail.API.Drafts.Create.Request,
            Gmail.API.Drafts.Create.Response,
            (outgoing) => this.post("/users/me/drafts", {
                message: {
                    raw: Gmail.buildRawMessage(outgoing),
                    ...(outgoing.threadId ? { threadId: outgoing.threadId } : {}),
                },
            }),
        ),
    }

    public readonly labels = {
        list: withAPIParsing(
            Gmail.API.Labels.List.Request,
            Gmail.API.Labels.List.Response,
            () => this.get("/users/me/labels"),
        ),
    }

    private async fetchMessage(id: string): Promise<Google.Gmail.Message> {
        const raw = await this.get(`/users/me/messages/${encodeSegment(id)}`, { format: "full" })

        return Gmail.parseMessage(Gmail.RawMessage.parse(raw))
    }
}
