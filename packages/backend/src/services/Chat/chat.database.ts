import { Injectable } from '@nestjs/common';
import { Auth, Chat, Workflow } from '@pretzel-graph/shared/domain';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAssert, ZodReturn } from '../../decorators/database';
import { z } from 'zod';

class ChatMethods {

    @SupabaseAssert('chat.create')
    @ZodReturn(Chat.Schema)
    async create(supabase: SupabaseClient, userId: Auth.User.Id, workflow_id: Workflow.Id, name = 'New Chat'): Promise<Chat> {
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
            updated_at: new Date().toISOString(),
        };
    }

    @SupabaseAssert('chat.get')
    @ZodReturn(z.object({ chat: Chat.Schema, messages: Chat.Message.Schema.array() }))
    async get(supabase: SupabaseClient, userId: Auth.User.Id, chatId: Chat.Id): Promise<{ chat: Chat; messages: Chat.Message[] }> {
        const { data } = await supabase
            .from('chats')
            .select<string, Chat & { chat_messages: Chat.Message[] }>('id, user_id, workflow_id, name, created_at, updated_at, chat_messages(*)')
            .eq('id', chatId)
            .eq('user_id', userId)
            .order('created_at', { referencedTable: 'chat_messages', ascending: true })
            .single()
            .throwOnError();

        if (!data)
            throw new Error('Chat not found');

        const { chat_messages, ...chat } = data;
        return { chat, messages: chat_messages ?? [] };
    }

    @SupabaseAssert('chat.list')
    @ZodReturn(Chat.Schema.array())
    async list(supabase: SupabaseClient, userId: Auth.User.Id): Promise<Chat[]> {
        const { data } = await supabase
            .from('chats')
            .select<string, Chat>('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .throwOnError();

        return data ?? [];
    }

    @SupabaseAssert('chat.ensure')
    @ZodReturn(Chat.Schema)
    async ensure(supabase: SupabaseClient, userId: Auth.User.Id, chatId: Chat.Id, workflow_id: Workflow.Id, name = 'New Chat'): Promise<Chat> {
        const { data: existing } = await supabase
            .from('chats')
            .select<string, Chat>('*')
            .eq('id', chatId)
            .eq('user_id', userId)
            .single();

        if (existing) return existing;

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
    }

    @SupabaseAssert('chat.erase')
    async erase(supabase: SupabaseClient, userId: Auth.User.Id, chatId: Chat.Id): Promise<void> {
        await supabase.from('chat_messages').delete().eq('chat_id', chatId).throwOnError();
        await supabase.from('chats').delete().eq('id', chatId).eq('user_id', userId).throwOnError();
    }
}

class MessageMethods {

    @SupabaseAssert('message.add')
    async add(supabase: SupabaseClient, messages: Chat.Message[]): Promise<void> {
        await supabase
            .from('chat_messages')
            .insert(messages.map(message => ({
                id:          message.id,
                chat_id:     message.chat_id,
                role:        message.role,
                content:     message.content,
                data:        message.data ?? {},
                attachments: message.attachments ?? null,
                created_at:  new Date(),
            })))
            .throwOnError();
    }

    @SupabaseAssert('message.erase')
    async erase(supabase: SupabaseClient, messageId: Chat.Message.Id): Promise<void> {
        await supabase.from('chat_messages').delete().eq('id', messageId).throwOnError();
    }

    @SupabaseAssert('message.update')
    async update(supabase: SupabaseClient, messageId: Chat.Message.Id, content: string): Promise<void> {
        await supabase.from('chat_messages').update({ content }).eq('id', messageId).throwOnError();
    }

    @SupabaseAssert('message.list')
    @ZodReturn(Chat.Message.Schema.array())
    async list(supabase: SupabaseClient, chatId: Chat.Id): Promise<Chat.Message[]> {
        const { data } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true })
            .throwOnError();

        return data ?? [];
    }

    @SupabaseAssert('message.overwrite')
    async overwrite(supabase: SupabaseClient, chatId: Chat.Id, messages: Chat.Message[]): Promise<void> {
        await supabase.from('chat_messages').delete().eq('chat_id', chatId).throwOnError();

        if (messages.length === 0) return;

        await supabase
            .from('chat_messages')
            .insert(messages.map(message => ({
                id:          message.id,
                chat_id:     message.chat_id,
                role:        message.role,
                content:     message.content,
                data:        message.data ?? {},
                attachments: message.attachments ?? null,
                created_at:  new Date(),
            })))
            .throwOnError();
    }
}

@Injectable()
export class ChatDatabase {
    public readonly chat    = new ChatMethods();
    public readonly message = new MessageMethods();
}
