import { Service } from "../ServiceManager";
import { Router, Request, Response } from "express";
import { WithAuth, withAuth } from "@/handlers/controller";
import { createAuthenticatedClient, getUserId } from "@/utils/supabase";
import { Auth, Chat, Orchestrator, Workbench } from "@vx-agent-editor/shared/domain";
import { WithSupabase } from "@/handlers/database";
import { OrchestratorService } from "../Orchestrator/service";
import Redis from "ioredis";
import { REDIS_HOST, REDIS_PORT } from "@vx-agent-editor/shared/constants";
import { channel } from "node:diagnostics_channel";

@Service("Chat")
export class ChatServiceImpl {

    constructor() { 


    }

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
            erase: async (supabase, chatId) => {
                await supabase.from('chats').delete().eq('id', chatId);
            },
        },
        message: {
            send: async (supabase, message) => {
                await supabase.from('chat_messages').insert({
                    id: message.id,
                    chat_id: message.chat_id,
                    role: message.role,
                    content: message.content,
                    metadata: null,
                    attachments: message.attachments ?? null,
                    created_at: new Date(),
                });
            },
            erase: async (supabase, messageId) => {
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

            const chatMetas = await this.dbOps.chat.list(supabase, userId);
            return { chatMetas }
        },
        erase: async (token, payload) => {
            const supabase = createAuthenticatedClient(token);
            await this.dbOps.chat.erase(supabase, payload.chatId);
        },
        message: {
            send: async (token, { message, workflow, snapshot }) => {
                const supabase = createAuthenticatedClient(token);
                const chatId = message.chat_id;
                await this.dbOps.message.send(supabase, message)

                const { jobId } = await OrchestratorService.ops.execution.run(token, {
                    workflow,
                    snapshot
                })

                const responseMessageId = Chat.Message.createId(chatId, "assistant");

                const responseMessage: Chat.Message.Assistant = {
                    id: responseMessageId,
                    chat_id: chatId,
                    role: "assistant",
                    content: "",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    attachments: {},
                    isProcessing: true,
                    tool_calls: []
                }

                return { jobId, responseMessage }
            },
            erase: async (token, payload) => {
                const supabase = createAuthenticatedClient(token);
                // TODO: Delete the message
            }
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
            })
        },
    }

    public readonly routes = Router()
        .post("/create", this.controller.create)
        .post("/get", this.controller.get)
        .get("/list", this.controller.list)
        .post("/erase", this.controller.erase)
        .post("/message/send", this.controller.message.send)
        .post("/message/erase", this.controller.message.erase)
}

export const ChatService = Service.get<ChatServiceImpl>("Chat");



export namespace ChatService {
    export type DbOps = {
        chat: {
            create: WithSupabase<(userId: Auth.User.Id) => Promise<Chat.Id>>
            get: WithSupabase<(chatId: Chat.Id) => Promise<any>>
            list: WithSupabase<(userId: Auth.User.Id) => Promise<any[]>>
            erase: WithSupabase<(chatId: Chat.Id) => Promise<void>>
        }
        message: {
            send: WithSupabase<(message: Chat.Message) => Promise<void>>
            erase: WithSupabase<(messageId: Chat.Message.Id) => Promise<void>>
        }
    }

    export type Ops = {
        create: WithAuth<() => Promise<Chat.API.Create.Response>>
        get: WithAuth<(payload: Chat.API.Get.Request) => Promise<Chat.API.Get.Response>>
        list: WithAuth<() => Promise<Chat.API.List.Response>>
        erase: WithAuth<(payload: Chat.API.Erase.Request) => Promise<void>>
        message: {
            send: WithAuth<(payload: Chat.API.Message.Send.Request) => Promise<Chat.API.Message.Send.Response>>
            erase: WithAuth<(payload: Chat.API.Message.Erase.Request) => Promise<void>>,
        }
    }

    export type Controller = {
        create: (req: Request, res: Response) => void
        get: (req: Request, res: Response) => void
        list: (req: Request, res: Response) => void
        erase: (req: Request, res: Response) => void
        message: {
            send: (req: Request, res: Response) => void
            erase: (req: Request, res: Response) => void
        }
    }
}
