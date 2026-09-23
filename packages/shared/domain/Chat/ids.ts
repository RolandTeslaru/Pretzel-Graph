import z from "zod"

export const ChatId = z.uuid().brand("ChatId")
export type ChatId = z.infer<typeof ChatId>
export const createId = () => crypto.randomUUID() as ChatId

// Names a chat by where it came from, for one a gateway event opened rather than the editor.
export const ChatExternalKey = z.string().brand("ChatExternalKey")
export type ChatExternalKey = z.infer<typeof ChatExternalKey>
