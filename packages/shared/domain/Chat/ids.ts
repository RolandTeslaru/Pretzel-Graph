import z from "zod"

export const ChatId = z.uuid().brand("ChatId")
export type ChatId = z.infer<typeof ChatId>
export const createId = () => crypto.randomUUID() as ChatId
