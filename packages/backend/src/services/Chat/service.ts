import { Service } from "../ServiceManager";
import { Router, Request, Response } from "express";
import { WithAuth, withAuth } from "@/handlers/controller";
import { createAuthenticatedClient, getUserId } from "@/utils/supabase";
import { Auth, Chat, Workflow } from "@vx-agent-editor/shared/domain";
import { WithSupabase } from "@/handlers/database";

@Service("Chat")
export class ChatServiceImpl {

    constructor() { }

    private assertSupabaseOk(error: unknown, operation: string): void {
        if (!error) return;

        const message =
            typeof error === "object" && error !== null && "message" in error
                ? String((error as { message?: unknown }).message ?? "Unknown Supabase error")
                : "Unknown Supabase error";

        throw new Error(`[ChatService:${operation}] ${message}`);
    }

    private readonly dbOps: ChatService.DbOps = {
        chat: {
            create: async (supabase, userId, workflow_id, name = "New Chat") => {

                const { data, error } = await supabase
                    .from('chats')
                    .insert({
                        user_id: userId,
                        workflow_id,
                        name,
                        created_at: new Date(),
                        updated_at: new Date(),
                    })
                    .select('id')
                    .single();

                this.assertSupabaseOk(error, "chat.create");
                if (!data?.id) {
                    throw new Error("[ChatService:chat.create] Missing inserted chat id");
                }
                return {
                    id: data.id,
                    workflow_id,
                    name: "New Chat",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                } satisfies Chat;
            },
            get: async (supabase, chatId) => {
                const { data, error } = await supabase
                    .from('chats')
                    .select('id, user_id, workflow_id, name, created_at, updated_at, chat_messages(*)')
                    .eq('id', chatId)
                    .order('created_at', { referencedTable: 'chat_messages', ascending: true })
                    .single();

                this.assertSupabaseOk(error, "chat.get");
                if (!data) {
                    throw new Error("[ChatService:chat.get] Chat not found");
                }

                const { chat_messages, ...chat } = data;

                return {
                    chat,
                    messages: chat_messages ?? []
                };
            },
            list: async (supabase, userId) => {
                const { data, error } = await supabase
                    .from('chats')
                    .select('*')
                    .eq('user_id', userId)
                    .order('updated_at', { ascending: false });

                this.assertSupabaseOk(error, "chat.list");
                return data ?? []
            },
            erase: async (supabase, chatId) => {
                const { error } = await supabase.from('chats').delete().eq('id', chatId);
                this.assertSupabaseOk(error, "chat.erase");
            },
        },
        message: {
            add: async (supabase, message) => {
                const { error } = await supabase.from('chat_messages').insert({
                    id: message.id,
                    chat_id: message.chat_id,
                    role: message.role,
                    content: message.content,
                    data: message.data ?? {},
                    attachments: message.attachments ?? null,
                    created_at: new Date(),
                });

                this.assertSupabaseOk(error, "message.add");
            },
            erase: async (supabase, messageId) => {
                const { error } = await supabase.from('chat_messages').delete().eq('id', messageId);
                this.assertSupabaseOk(error, "message.erase");
            },
            update: async (supabase, messageId, content) => {
                const { error } = await supabase
                .from('chat_messages')
                .update({ content })
                .eq('id', messageId);
                
                console.log("Updating message", messageId, "with content", content, "errror" , error);
                this.assertSupabaseOk(error, "message.update");
            }
        }
    }

    public readonly ops: ChatService.Ops = {
        create: async (token, payload) => {
            const supabase = createAuthenticatedClient(token);
            const { workflow_id, name } = payload

            const userId = await getUserId(supabase) as Auth.User.Id;
            if (!userId) throw new Error("User not found");

            const chat = await this.dbOps.chat.create(supabase, userId, workflow_id, name);
            return { chat }
        },
        get: async (token, payload) => {
            const supabase = createAuthenticatedClient(token);
            const data = await this.dbOps.chat.get(supabase, payload.chatId);

            return data;
        },
        list: async (token) => {
            const supabase = createAuthenticatedClient(token);
            const userId = await getUserId(supabase) as Auth.User.Id;
            if (!userId) throw new Error("User not found");

            const chats = await this.dbOps.chat.list(supabase, userId);
            return { chats }
        },
        erase: async (token, payload) => {
            const supabase = createAuthenticatedClient(token);
            await this.dbOps.chat.erase(supabase, payload.chatId);
            return {}
        },
        message: {
            send: async (token, { message }) => {
                const supabase = createAuthenticatedClient(token);
                await this.dbOps.message.add(supabase, message)
                return { };
            },
            respond: async (token, { responseMessage }) => {
                const supabase = createAuthenticatedClient(token);
                
                await this.dbOps.message.add(supabase, responseMessage)
                return { };
            }, 
            erase: async (token, payload) => {
                const supabase = createAuthenticatedClient(token);
                await this.dbOps.message.erase(supabase, payload.messageId);
                return {};
            },
            update: async (token, { messageId, content }) => {
                const supabase = createAuthenticatedClient(token);
                await this.dbOps.message.update(supabase, messageId, content);
                return {};
            }
        }
    }

    public readonly controller: ChatService.Controller = {
        create: withAuth(async (token, req) => {
            const payload = Chat.API.Create.Request.parse(req.body);
            return await this.ops.create(token, payload);
        }),
        get: withAuth(async (token, req) => {
            const payload = Chat.API.Get.Request.parse(req.body);
            return await this.ops.get(token, payload);
        }),
        list: withAuth(async (token, req) => {
            return await this.ops.list(token);
        }),
        erase: withAuth(async (token, req) => {
            const payload = Chat.API.Erase.Request.parse(req.body);
            return await this.ops.erase(token, payload);
        }),
        message: {
            send: withAuth(async (token, req) => {
                const payload = Chat.API.Message.Send.Request.parse(req.body);
                return await this.ops.message.send(token, payload);
            }),
            erase: withAuth(async (token, req) => {
                const payload = Chat.API.Message.Erase.Request.parse(req.body);
                return await this.ops.message.erase(token, payload);
            }),
            respond: withAuth(async (token, req) => {
                const payload = Chat.API.Message.Respond.Request.parse(req.body);
                return await this.ops.message.respond(token, payload);
             }),
            update: withAuth(async (token, req) => {
                const payload = Chat.API.Message.Update.Request.parse(req.body);
                return await this.ops.message.update(token, payload);
            })

        },
    }

    public readonly routes = Router()
        .post("/create", this.controller.create)
        .post("/get", this.controller.get)
        .post("/list", this.controller.list)
        .post("/erase", this.controller.erase)
        .post("/message/send", this.controller.message.send)
        .post("/message/respond", this.controller.message.respond)
        .post("/message/erase", this.controller.message.erase)
        .post("/message/update", this.controller.message.update)
}

export const ChatService = Service.get<ChatServiceImpl>("Chat");



export namespace ChatService {
    export type DbOps = {
        chat: {
            create: WithSupabase<(userId: Auth.User.Id, workflow_id: Workflow.Id, name?: string) => Promise<Chat>>
            get: WithSupabase<(chatId: Chat.Id) => Promise<Chat.API.Get.Response>>
            list: WithSupabase<(userId: Auth.User.Id) => Promise<Chat[]>>
            erase: WithSupabase<(chatId: Chat.Id) => Promise<void>>
        }
        message: {
            add: WithSupabase<(message: Chat.Message) => Promise<void>>
            erase: WithSupabase<(messageId: Chat.Message.Id) => Promise<void>>
            update: WithSupabase<(messageId: Chat.Message.Id, content: string) => Promise<void>>
        }
    }

    export type Ops = {
        create: WithAuth<(payload: Chat.API.Create.Request) => Promise<Chat.API.Create.Response>>
        get: WithAuth<(payload: Chat.API.Get.Request) => Promise<Chat.API.Get.Response>>
        list: WithAuth<() => Promise<Chat.API.List.Response>>
        erase: WithAuth<(payload: Chat.API.Erase.Request) => Promise<Chat.API.Erase.Response>>
        message: {
            send: WithAuth<(payload: Chat.API.Message.Send.Request) => Promise<Chat.API.Message.Send.Response>>
            respond: WithAuth<(payload: Chat.API.Message.Respond.Request) => Promise<Chat.API.Message.Respond.Response>>
            erase: WithAuth<(payload: Chat.API.Message.Erase.Request) => Promise<Chat.API.Message.Erase.Response>>,
            update: WithAuth<(payload: Chat.API.Message.Update.Request) => Promise<Chat.API.Message.Update.Response>>
        }
    }

    export type Controller = {
        create: (req: Request, res: Response) => void
        get: (req: Request, res: Response) => void
        list: (req: Request, res: Response) => void
        erase: (req: Request, res: Response) => void
        message: {
            send: (req: Request, res: Response) => void
            respond: (req: Request, res: Response) => void
            erase: (req: Request, res: Response) => void
            update: (req: Request, res: Response) => void
        }
    }
}
