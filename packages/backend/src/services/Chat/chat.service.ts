import { Injectable } from '@nestjs/common';
import { createAuthenticatedClient } from '@/utils/supabase';
import { Auth, Chat, Workflow } from '@pretzel-graph/shared/domain';
import { SupabaseClient } from '@supabase/supabase-js';
import { withSupabaseAssert } from '@pretzel-graph/shared/errors/supabase';

@Injectable()
export class ChatService {

    private readonly dbOps = {
        chat: {
            create: withSupabaseAssert('chat.create', async (
                supabase: SupabaseClient,
                userId: Auth.User.Id,
                workflow_id: Workflow.Id,
                name = "New Chat"
            ) => {
                const { data } = await supabase
                    .from('chats')
                    .insert({
                        user_id: userId,
                        workflow_id,
                        name: name ?? "New Chat",
                        created_at: new Date(),
                        updated_at: new Date(),
                    })
                    .select<string, { id: Chat.Id }>('id')
                    .single()
                    .throwOnError();

                return {
                    id: data!.id,
                    workflow_id,
                    name: name ?? "New Chat",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                } satisfies Chat;
            }),
            get: withSupabaseAssert('chat.get', async (
                supabase: SupabaseClient,
                userId: Auth.User.Id,
                chatId: Chat.Id
            ) => {
                const { data } = await supabase
                    .from('chats')
                    .select<string, Chat & { chat_messages: Chat.Message[] }>('id, user_id, workflow_id, name, created_at, updated_at, chat_messages(*)')
                    .eq('id', chatId)
                    .eq("user_id", userId)
                    .order('created_at', { referencedTable: 'chat_messages', ascending: true })
                    .single()
                    .throwOnError();

                if (!data) {
                    throw new Error("Chat not found");
                }

                const { chat_messages, ...chat } = data;

                return {
                    chat,
                    messages: chat_messages ?? []
                };
            }),
            list: withSupabaseAssert('chat.list', async (
                supabase: SupabaseClient,
                userId: Auth.User.Id
            ) => {
                const { data } = await supabase
                    .from('chats')
                    .select<string, Chat>('*')
                    .eq('user_id', userId)
                    .order('updated_at', { ascending: false })
                    .throwOnError();

                return data ?? [];
            }),
            ensure: withSupabaseAssert('chat.ensure', async (
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
                    return existing;
                }

                const { data } = await supabase
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
                    .single()
                    .throwOnError();

                if (!data)
                    throw new Error("Missing inserted chat");

                return data;
            }),
            erase: withSupabaseAssert('chat.erase', async (
                supabase: SupabaseClient,
                userId: Auth.User.Id,
                chatId: Chat.Id
            ) => {
                await supabase
                    .from('chat_messages')
                    .delete()
                    .eq('chat_id', chatId)
                    .throwOnError();

                await supabase
                    .from('chats')
                    .delete()
                    .eq('id', chatId)
                    .eq('user_id', userId)
                    .throwOnError();
            }),
        },
        // Note: chat_messages has RLS policies that join with chats to check user_id,
        // so ownership is enforced at the database level — no need for application-level checks.
        message: {
            add: withSupabaseAssert('message.add', async (
                supabase: SupabaseClient,
                messages: Chat.Message[]
            ) => {
                await supabase
                    .from('chat_messages')
                    .insert(messages.map(message => ({
                        id: message.id,
                        chat_id: message.chat_id,
                        role: message.role,
                        content: message.content,
                        data: message.data ?? {},
                        attachments: message.attachments ?? null,
                        created_at: new Date(),
                    })))
                    .throwOnError();
            }),
            erase: withSupabaseAssert('message.erase', async (
                supabase: SupabaseClient,
                messageId: Chat.Message.Id
            ) => {
                await supabase
                    .from('chat_messages')
                    .delete()
                    .eq('id', messageId)
                    .throwOnError();
            }),
            update: withSupabaseAssert('message.update', async (
                supabase: SupabaseClient,
                messageId: Chat.Message.Id,
                content: string
            ) => {
                await supabase
                    .from('chat_messages')
                    .update({ content })
                    .eq('id', messageId)
                    .throwOnError();
            })
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
        add: async (
            token: string,
            payload: Chat.API.Message.Add.Request
        ): Promise<Chat.API.Message.Add.Response> => {
            const supabase = createAuthenticatedClient(token);
            const { messages } = payload;
            await this.dbOps.message.add(supabase, messages);
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
