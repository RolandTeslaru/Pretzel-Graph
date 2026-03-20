import { Injectable } from '@nestjs/common';
import { createAuthenticatedClient } from '@/utils/supabase';
import { Auth, Chat, Workflow } from '@vx-agent-editor/shared/domain';
import { SupabaseClient } from '@supabase/supabase-js';

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
            create: async (
                supabase: SupabaseClient,
                userId: Auth.User.Id,
                workflow_id: Workflow.Id,
                name = "New Chat"
            ) => {
                const { data, error } = await supabase
                    .from('chats')
                    .insert({
                        user_id: userId,
                        workflow_id,
                        name: name ?? "New Chat",
                        created_at: new Date(),
                        updated_at: new Date(),
                    })
                    .select<string, { id: Chat.Id }>('id')
                    .single();

                this.assertSupabaseOk(error, "chat.create");

                if (!data?.id)
                    throw new Error("[ChatService:chat.create] Missing inserted chat id");
                
                return {
                    id: data.id,
                    workflow_id,
                    name: name ?? "New Chat",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                } satisfies Chat;
            },
            get: async (
                supabase: SupabaseClient,
                userId: Auth.User.Id,
                chatId: Chat.Id
            ) => {
                const { data, error } = await supabase
                    .from('chats')
                    .select<string, Chat & { chat_messages: Chat.Message[] }>('id, user_id, workflow_id, name, created_at, updated_at, chat_messages(*)')
                    .eq('id', chatId)
                    .eq("user_id", userId)
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
            list: async (supabase: SupabaseClient, userId: Auth.User.Id) => {
                const { data, error } = await supabase
                    .from('chats')
                    .select<string, Chat>('*')
                    .eq('user_id', userId)
                    .order('updated_at', { ascending: false });

                this.assertSupabaseOk(error, "chat.list");
                return data ?? [];
            },
            ensure: async (
                supabase: SupabaseClient,
                userId: Auth.User.Id,
                chatId: Chat.Id,
                workflow_id: Workflow.Id,
                name = "New Chat"
            ) => {
                const { data: existing } = await supabase
                    .from('chats')
                    .select<string, Chat>('*')
                    .eq('id', chatId)
                    .eq('user_id', userId)
                    .single();

                if (existing) {
                    return existing
                }

                const { data, error } = await supabase
                    .from('chats')
                    .insert({
                        id: chatId,
                        user_id: userId,
                        workflow_id,
                        name: name ?? "New Chat",
                        created_at: new Date(),
                        updated_at: new Date(),
                    })
                    .select<string, Chat>('*')
                    .single();

                this.assertSupabaseOk(error, "chat.ensure");

                if (!data)
                    throw new Error("[ChatService:chat.ensure] Missing inserted chat");

                return data;
            },
            erase: async (supabase: SupabaseClient, userId: Auth.User.Id, chatId: Chat.Id) => {
                const { error: messagesError } = await supabase
                    .from('chat_messages')
                    .delete()
                    .eq('chat_id', chatId);
                this.assertSupabaseOk(messagesError, "chat.erase.messages");

                const { error } = await supabase
                    .from('chats')
                    .delete()
                    .eq('id', chatId)
                    .eq('user_id', userId);
                this.assertSupabaseOk(error, "chat.erase");
            },
        },
        message: {
            add: async (supabase: SupabaseClient, message: Chat.Message) => {
                const { error } = await supabase
                    .from('chat_messages')
                    .insert({
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
            erase: async (supabase: SupabaseClient, messageId: Chat.Message.Id) => {
                const { error } = await supabase.from('chat_messages').delete().eq('id', messageId);
                this.assertSupabaseOk(error, "message.erase");
            },
            update: async (supabase: SupabaseClient, messageId: Chat.Message.Id, content: string) => {
                const { error } = await supabase
                    .from('chat_messages')
                    .update({ content })
                    .eq('id', messageId);

                this.assertSupabaseOk(error, "message.update");
            }
        }
    };

    async create(
        token: string,
        userId: Auth.User.Id,
        payload: Chat.API.Create.Request
    ): Promise<Chat.API.Create.Response> {
        const supabase = createAuthenticatedClient(token);
        const { workflow_id, name } = payload

        const chat = await this.dbOps.chat.create(
            supabase, userId, workflow_id, name
        );

        return { chat };
    }

    async ensure(
        token: string,
        userId: Auth.User.Id,
        payload: Chat.API.Ensure.Request
    ): Promise<Chat.API.Ensure.Response> {
        const supabase = createAuthenticatedClient(token);
        const { chatId, workflow_id, name } = payload;
        const chat = await this.dbOps.chat.ensure(supabase, userId, chatId, workflow_id, name);
        return { chat };
    }

    async get(
        token: string,
        userId: Auth.User.Id,
        payload: Chat.API.Get.Request
    ): Promise<Chat.API.Get.Response> {
        const supabase = createAuthenticatedClient(token);
        return await this.dbOps.chat.get(supabase, userId, payload.chatId);
    }

    async list(
        token: string,
        userId: Auth.User.Id
    ): Promise<Chat.API.List.Response> {
        const supabase = createAuthenticatedClient(token);
        const chats = await this.dbOps.chat.list(supabase, userId);
        return { chats };
    }

    async erase(
        token: string,
        userId: Auth.User.Id,
        payload: Chat.API.Erase.Request
    ): Promise<Chat.API.Erase.Response> {
        const supabase = createAuthenticatedClient(token);
        await this.dbOps.chat.erase(supabase, userId, payload.chatId);
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
