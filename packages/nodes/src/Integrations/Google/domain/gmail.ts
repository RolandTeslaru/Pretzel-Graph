import { z } from "zod"

export namespace Gmail {

    export const Header = z.looseObject({
        name:  z.string(),
        value: z.string(),
    })

    export const Body = z.looseObject({
        attachmentId: z.string().optional(),
        size:         z.number().optional(),
        data:         z.string().optional(),
    })

    export type Part = {
        partId?:   string
        mimeType?: string
        filename?: string
        headers?:  z.infer<typeof Header>[]
        body?:     z.infer<typeof Body>
        parts?:    Part[]
    }

    export const Part: z.ZodType<Part> = z.lazy(() => z.looseObject({
        partId:   z.string().optional(),
        mimeType: z.string().optional(),
        filename: z.string().optional(),
        headers:  z.array(Header).optional(),
        body:     Body.optional(),
        parts:    z.array(Part).optional(),
    })) as z.ZodType<Part>

    // What the API returns for one message with format=full.
    export const RawMessage = z.looseObject({
        id:           z.string(),
        threadId:     z.string(),
        labelIds:     z.array(z.string()).optional(),
        snippet:      z.string().optional(),
        internalDate: z.string().optional(),
        payload:      Part.optional(),
    })
    export type RawMessage = z.infer<typeof RawMessage>

    export const Attachment = z.object({
        id:       z.string(),
        filename: z.string(),
        mimeType: z.string(),
        size:     z.number(),
    })
    export type Attachment = z.infer<typeof Attachment>

    // The message as nodes and tools see it: headers lifted, body decoded once.
    export const Message = z.object({
        id:          z.string(),
        threadId:    z.string(),
        labelIds:    z.array(z.string()),
        snippet:     z.string(),
        date:        z.string().optional(),
        from:        z.string().optional(),
        to:          z.string().optional(),
        cc:          z.string().optional(),
        subject:     z.string().optional(),
        messageId:   z.string().optional(),
        text:        z.string(),
        html:        z.string().optional(),
        attachments: z.array(Attachment),
    })
    export type Message = z.infer<typeof Message>

    export const Label = z.looseObject({
        id:             z.string(),
        name:           z.string(),
        type:           z.string().optional(),
        messagesTotal:  z.number().optional(),
        messagesUnread: z.number().optional(),
    })
    export type Label = z.infer<typeof Label>

    export const Recipients = z.union([z.string(), z.array(z.string())])
        .transform(value => Array.isArray(value) ? value : value.split(",").map(s => s.trim()).filter(Boolean))

    export const Outgoing = z.object({
        to:         Recipients,
        cc:         Recipients.optional(),
        bcc:        Recipients.optional(),
        subject:    z.string().default(""),
        text:       z.string().optional(),
        html:       z.string().optional(),
        // Reply threading: the thread to join and the message being answered.
        threadId:   z.string().optional(),
        inReplyTo:  z.string().optional(),
    })
    export type Outgoing = z.infer<typeof Outgoing>

    export namespace API {

        export namespace Messages {
            export namespace Search {
                export const Request = z.object({
                    q:               z.string().optional(),
                    maxResults:      z.number().int().min(1).max(100).default(20),
                    labelIds:        z.array(z.string()).optional(),
                    includeSpamTrash: z.boolean().default(false),
                    pageToken:       z.string().optional(),
                }).prefault({})
                export const Response = z.object({
                    messages:      z.array(Message),
                    nextPageToken: z.string().optional(),
                })
            }

            export namespace Get {
                export const Request  = z.object({ id: z.string() })
                export const Response = Message
            }

            export namespace Send {
                export const Request  = Outgoing
                export const Response = z.looseObject({
                    id:       z.string(),
                    threadId: z.string(),
                    labelIds: z.array(z.string()).optional(),
                })
            }

            export namespace Modify {
                export const Request = z.object({
                    id:             z.string(),
                    addLabelIds:    z.array(z.string()).optional(),
                    removeLabelIds: z.array(z.string()).optional(),
                })
                export const Response = z.looseObject({
                    id:       z.string(),
                    threadId: z.string(),
                    labelIds: z.array(z.string()).optional(),
                })
            }

            export namespace Trash {
                export const Request  = z.object({ id: z.string() })
                export const Response = Modify.Response
            }
        }

        export namespace Drafts {
            export namespace Create {
                export const Request  = Outgoing
                export const Response = z.looseObject({
                    id:      z.string(),
                    message: z.looseObject({ id: z.string(), threadId: z.string() }),
                })
            }
        }

        export namespace Labels {
            export namespace List {
                export const Request  = z.object({}).prefault({})
                export const Response = z.object({ labels: z.array(Label) })
            }
        }
    }

    // Base64url with the padding Gmail leaves off.
    export function decodeBody(data: string | undefined): string {
        if (!data)
            return ""

        return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    }

    export function parseMessage(raw: RawMessage): Message {
        const headers = new Map<string, string>()

        for (const header of raw.payload?.headers ?? [])
            headers.set(header.name.toLowerCase(), header.value)

        let text = ""
        let html: string | undefined
        const attachments: Attachment[] = []

        const walk = (part: Part | undefined) => {
            if (!part)
                return

            const mimeType = part.mimeType ?? ""

            if (part.filename && part.body?.attachmentId) {
                attachments.push({
                    id:       part.body.attachmentId,
                    filename: part.filename,
                    mimeType,
                    size:     part.body.size ?? 0,
                })
            }
            else if (mimeType === "text/plain" && part.body?.data && !text) {
                text = decodeBody(part.body.data)
            }
            else if (mimeType === "text/html" && part.body?.data && !html) {
                html = decodeBody(part.body.data)
            }

            for (const child of part.parts ?? [])
                walk(child)
        }

        walk(raw.payload)

        if (!text && html)
            text = html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

        return {
            id:          raw.id,
            threadId:    raw.threadId,
            labelIds:    raw.labelIds ?? [],
            snippet:     raw.snippet ?? "",
            date:        headers.get("date"),
            from:        headers.get("from"),
            to:          headers.get("to"),
            cc:          headers.get("cc"),
            subject:     headers.get("subject"),
            messageId:   headers.get("message-id"),
            text,
            html,
            attachments,
        }
    }

    // RFC 2822 with a base64url body, which is the only shape the send endpoint takes.
    export function buildRawMessage(outgoing: Outgoing): string {
        const lines: string[] = []

        lines.push(`To: ${outgoing.to.join(", ")}`)

        if (outgoing.cc?.length)
            lines.push(`Cc: ${outgoing.cc.join(", ")}`)

        if (outgoing.bcc?.length)
            lines.push(`Bcc: ${outgoing.bcc.join(", ")}`)

        lines.push(`Subject: ${encodeHeader(outgoing.subject)}`)

        if (outgoing.inReplyTo) {
            lines.push(`In-Reply-To: ${outgoing.inReplyTo}`)
            lines.push(`References: ${outgoing.inReplyTo}`)
        }

        lines.push("MIME-Version: 1.0")

        const text = outgoing.text ?? ""
        const html = outgoing.html

        if (html) {
            const boundary = `pretzel_${Date.now().toString(36)}`

            lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)
            lines.push("")
            lines.push(`--${boundary}`)
            lines.push("Content-Type: text/plain; charset=utf-8")
            lines.push("Content-Transfer-Encoding: base64")
            lines.push("")
            lines.push(Buffer.from(text, "utf8").toString("base64"))
            lines.push(`--${boundary}`)
            lines.push("Content-Type: text/html; charset=utf-8")
            lines.push("Content-Transfer-Encoding: base64")
            lines.push("")
            lines.push(Buffer.from(html, "utf8").toString("base64"))
            lines.push(`--${boundary}--`)
        }
        else {
            lines.push("Content-Type: text/plain; charset=utf-8")
            lines.push("Content-Transfer-Encoding: base64")
            lines.push("")
            lines.push(Buffer.from(text, "utf8").toString("base64"))
        }

        return Buffer.from(lines.join("\r\n"), "utf8")
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "")
    }

    function encodeHeader(value: string): string {
        return /^[\x20-\x7e]*$/.test(value)
            ? value
            : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`
    }
}
