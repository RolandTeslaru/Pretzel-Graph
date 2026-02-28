import { Service } from "../ServiceManager";
import { Router, Request, Response } from "express";
import { WithAuth, withAuth } from "@/handlers/controller";
import { createAuthenticatedClient, getUserId } from "@/utils/supabase";
import { Auth, Chat } from "@vx-agent-editor/shared/domain";
import { WithSupabase } from "@/handlers/database";

@Service("Chat")
export class ChatServiceImpl {

    constructor() { }

    private readonly dbOps: ChatService.DbOps = {
        chat: {
            create: async (supabase, userId) => {
                const chatId = crypto.randomUUID() as Chat.Id
                await supabase.from('chats').insert({
                    id: chatId,
                    user_id: userId,
                    name: "New Chat",
                    created_at: new Date(),
                    updated_at: new Date(),
                });
                return chatId
            },
            get: async (supabase, chatId) => {
                const { data, error } = await supabase
                    .from('chats')
                    .select('*, chat_messages(*)')
                    .eq('id', chatId)
                    .single();

                if (error) throw error;
                return data
            },
            list: async (supabase, userId) => {
                const { data, error } = await supabase
                    .from('chats')
                    .select('id, name, created_at, updated_at')
                    .eq('user_id', userId)
                    .order('updated_at', { ascending: false });

                if (error) throw error;
                return data
            },
            delete: async (supabase, chatId) => {
                await supabase.from('chats').delete().eq('id', chatId);
            },
        },
        message: {
            send: async (supabase, { chatId, content, attachments }) => {
                const messageId = crypto.randomUUID() as Chat.Message.Id
                await supabase.from('chat_messages').insert({
                    id: messageId,
                    chat_id: chatId,
                    role: "user",
                    content,
                    metadata: null,
                    attachments: attachments ?? null,
                    created_at: new Date(),
                });
                return messageId
            },
            delete: async (supabase, messageId) => {
                await supabase.from('chat_messages').delete().eq('id', messageId);
            },
        }
    }

    public readonly ops: ChatService.Ops = {
        create: async (token) => {
            const supabase = createAuthenticatedClient(token);
            const userId = await getUserId(supabase) as Auth.User.Id;
            if (!userId) throw new Error("User not found");

            const chatId = await this.dbOps.chat.create(supabase, userId);
            return { chatId }
        },
        get: async (token, payload) => {
            const supabase = createAuthenticatedClient(token);
            const chat = await this.dbOps.chat.get(supabase, payload.chatId);
            return { chat }
        },
        list: async (token) => {
            const supabase = createAuthenticatedClient(token);
            const userId = await getUserId(supabase) as Auth.User.Id;
            if (!userId) throw new Error("User not found");

            const chats = await this.dbOps.chat.list(supabase, userId);
            return { chats }
        },
        delete: async (token, payload) => {
            const supabase = createAuthenticatedClient(token);
            await this.dbOps.chat.delete(supabase, payload.chatId);
        },
        message: {
            send: async (token, payload) => {
                const supabase = createAuthenticatedClient(token);

                const messageId = await this.dbOps.message.send(supabase, payload)
                
                
            },
            delete: async (token, payload) => {
                const supabase = createAuthenticatedClient(token);
                // TODO: Delete the message
            },
        }
    }

    public readonly controller: ChatService.Controller = {
        create: withAuth(async (token, req) => {
            return await this.ops.create(token);
        }),
        get: withAuth(async (token, req) => {
            const payload = Chat.API.Get.Request.parse(req.body);
            return await this.ops.get(token, payload);
        }),
        list: withAuth(async (token, req) => {
            return await this.ops.list(token);
        }),
        delete: withAuth(async (token, req) => {
            const payload = Chat.API.Delete.Request.parse(req.body);
            return await this.ops.delete(token, payload);
        }),
        message: {
            send: withAuth(async (token, req) => {
                const payload = Chat.API.Message.Send.Request.parse(req.body);
                return await this.ops.message.send(token, payload);
            }),
            delete: withAuth(async (token, req) => {
                const payload = Chat.API.Message.Delete.Request.parse(req.body);
                return await this.ops.message.delete(token, payload);
            }),
        }
    }

    public readonly routes = Router()
        .post("/create", this.controller.create)
        .post("/get", this.controller.get)
        .get("/list", this.controller.list)
        .post("/delete", this.controller.delete)
        .post("/message/send", this.controller.message.send)
        .post("/message/delete", this.controller.message.delete)
}

export const ChatService = Service.get<ChatServiceImpl>("Chat");



export namespace ChatService {
    export type DbOps = {
        chat: {
            create: WithSupabase<(userId: Auth.User.Id) => Promise<Chat.Id>>
            get: WithSupabase<(chatId: Chat.Id) => Promise<any>>
            list: WithSupabase<(userId: Auth.User.Id) => Promise<any[]>>
            delete: WithSupabase<(chatId: Chat.Id) => Promise<void>>
        }
        message: {
            send: WithSupabase<({ chatId, content, attachments }: { chatId: Chat.Id, content: string, attachments?: Chat.Attachment[] }) => Promise<Chat.Message.Id>>
            delete: WithSupabase<(messageId: Chat.Message.Id) => Promise<void>>
        }
    }

    export type Ops = {
        create: WithAuth<() => Promise<Chat.API.Create.Response>>
        get: WithAuth<(payload: Chat.API.Get.Request) => Promise<Chat.API.Get.Response>>
        list: WithAuth<() => Promise<Chat.API.List.Response>>
        delete: WithAuth<(payload: Chat.API.Delete.Request) => Promise<void>>
        message: {
            send: WithAuth<(payload: Chat.API.Message.Send.Request) => Promise<void>>
            delete: WithAuth<(payload: Chat.API.Message.Delete.Request) => Promise<void>>
        }
    }

    export type Controller = {
        create: (req: Request, res: Response) => void
        get: (req: Request, res: Response) => void
        list: (req: Request, res: Response) => void
        delete: (req: Request, res: Response) => void
        message: {
            send: (req: Request, res: Response) => void
            delete: (req: Request, res: Response) => void
        }
    }
}
