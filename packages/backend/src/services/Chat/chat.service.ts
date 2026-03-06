import { Injectable } from '@nestjs/common';
import { createAuthenticatedClient, getUserId } from '@/utils/supabase';
import { Auth, Chat, Workflow } from '@vx-agent-editor/shared/domain';

@Injectable()
export class ChatService {
    private assertSupabaseOk(error: unknown, operation: string): void {
        if (!error) return;

        const message =
            typeof error === "object" && error !== null && "message" in error
                ? String((error as { message?: unknown }).message ?? "Unknown Supabase error")
                : "Unknown Supabase error";

        throw new Error(`[ChatService:${operation}] ${message}`);
    }

    private readonly dbOps = {
        chat: {
            create: async (supabase: any, userId: string, workflow_id: string, name = "New Chat") => {
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
                    id: data.id as Chat.Id,
                    workflow_id: workflow_id as any as Workflow.Id,
                    name: "New Chat",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                } satisfies Chat;
            },
            get: async (supabase: any, chatId: string) => {
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
            list: async (supabase: any, userId: string) => {
                const { data, error } = await supabase
                    .from('chats')
                    .select('*')
                    .eq('user_id', userId)
                    .order('updated_at', { ascending: false });

                this.assertSupabaseOk(error, "chat.list");
                return data ?? [];
            },
            erase: async (supabase: any, chatId: string) => {
                const { error } = await supabase.from('chats').delete().eq('id', chatId);
                this.assertSupabaseOk(error, "chat.erase");
            },
        },
        message: {
            add: async (supabase: any, message: Chat.Message) => {
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
            erase: async (supabase: any, messageId: string) => {
                const { error } = await supabase.from('chat_messages').delete().eq('id', messageId);
                this.assertSupabaseOk(error, "message.erase");
            },
            update: async (supabase: any, messageId: string, content: string) => {
                const { error } = await supabase
                    .from('chat_messages')
                    .update({ content })
                    .eq('id', messageId);

                console.log("Updating message", messageId, "with content", content, "errror", error);
                this.assertSupabaseOk(error, "message.update");
            }
        }
    };

    async create(
        token: string,
        payload: Chat.API.Create.Request
    ): Promise<Chat.API.Create.Response> {
        const supabase = createAuthenticatedClient(token);
        const { workflow_id, name } = payload;

        const userId = await getUserId(supabase) as Auth.User.Id;
        if (!userId) throw new Error("User not found");

        const chat = await this.dbOps.chat.create(supabase, userId, workflow_id as any as Workflow.Id, name);

        return { chat };
    }


    async get(
        token: string,
        payload: Chat.API.Get.Request
    ): Promise<Chat.API.Get.Response> {
        const supabase = createAuthenticatedClient(token);
        return await this.dbOps.chat.get(supabase, payload.chatId);
    }


    async list(
        token: string
    ): Promise<Chat.API.List.Response> {
        const supabase = createAuthenticatedClient(token);

        const userId = await getUserId(supabase) as Auth.User.Id;
        if (!userId) throw new Error("User not found");

        const chats = await this.dbOps.chat.list(supabase, userId);

        return { chats };
    }


    async erase(
        token: string,
        payload: Chat.API.Erase.Request
    ): Promise<Chat.API.Erase.Response> {
        const supabase = createAuthenticatedClient(token);
        await this.dbOps.chat.erase(supabase, payload.chatId);

        return {};
    }

    public readonly message = {
        send: async (
            token: string,
            payload: Chat.API.Message.Send.Request
        ): Promise<Chat.API.Message.Send.Response> => {
            const supabase = createAuthenticatedClient(token);
            const { message } = payload;
            await this.dbOps.message.add(supabase, message);

            return {};
        },

        respond: async (
            token: string,
            payload: Chat.API.Message.Respond.Request
        ): Promise<Chat.API.Message.Respond.Response> => {
            const supabase = createAuthenticatedClient(token);
            const { responseMessage } = payload;
            await this.dbOps.message.add(supabase, responseMessage);

            return {};
        },

        erase: async (
            token: string,
            payload: Chat.API.Message.Erase.Request
        ): Promise<Chat.API.Message.Erase.Response> => {
            const supabase = createAuthenticatedClient(token);

            await this.dbOps.message.erase(supabase, payload.messageId);
            return {};
        },

        update: async (
            token: string,
            payload: Chat.API.Message.Update.Request
        ): Promise<Chat.API.Message.Update.Response> => {
            const supabase = createAuthenticatedClient(token);
            const { messageId, content } = payload;

            await this.dbOps.message.update(supabase, messageId, content);
            return {};
        }
    };
}
