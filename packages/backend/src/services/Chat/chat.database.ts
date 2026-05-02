import { Injectable } from '@nestjs/common';
import { Auth, Chat, Workflow } from '@pretzel-graph/shared/domain';
import { SupabaseClient } from '@supabase/supabase-js';
import { withSupabaseAssert } from '@pretzel-graph/shared/errors/supabase';

@Injectable()
export class ChatDatabase {
    public readonly chat = {
        create: withSupabaseAssert('chat.create', async (
            supabase: SupabaseClient,
            userId: Auth.User.Id,
            workflow_id: Workflow.Id,
            name = 'New Chat'
        ) => {
            const { data } = await supabase
                .from('chats')
                .insert({
                    user_id: userId,
                    workflow_id,
                    name: name ?? 'New Chat',
                    created_at: new Date(),
                    updated_at: new Date(),
                })
                .select<string, { id: Chat.Id }>('id')
                .single()
                .throwOnError();

            return {
                id: data!.id,
                workflow_id,
                name: name ?? 'New Chat',
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
                .eq('user_id', userId)
                .order('created_at', { referencedTable: 'chat_messages', ascending: true })
                .single()
                .throwOnError();

            if (!data) {
                throw new Error('Chat not found');
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
            name = 'New Chat'
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
                    name: name ?? 'New Chat',
                    created_at: new Date(),
                    updated_at: new Date(),
                })
                .select<string, Chat>('*')
                .single()
                .throwOnError();

            if (!data)
                throw new Error('Missing inserted chat');

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
    };

    public readonly message = {
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
        }),

        list: withSupabaseAssert('message.list', async (
            supabase: SupabaseClient,
            chatId: Chat.Id
        ): Promise<Chat.Message[]> => {
            const { data, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('chat_id', chatId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return (data ?? []) as Chat.Message[];
        }),

        overwrite: withSupabaseAssert('message.overwrite', async (
            supabase: SupabaseClient,
            chatId: Chat.Id,
            messages: Chat.Message[]
        ): Promise<void> => {
            await supabase
                .from('chat_messages')
                .delete()
                .eq('chat_id', chatId)
                .throwOnError();

            if (messages.length === 0) return;

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
    };
}
