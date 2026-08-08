import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Auth, Chat, Workflow } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { ZodReturn } from '../../decorators/database';
import { AllowedDatabaseRoles, DatabaseClass } from '../../decorators/database-roles';

@DatabaseClass
class ChatMethods {

    @AllowedDatabaseRoles("user")
    @ZodReturn(Chat.Schema)
    async create(
        trx: DB.UserTransaction,
        userId: Auth.User.Id,
        workflowId: Workflow.Id,
        name = 'New Chat',
    ): Promise<Chat> {
        const row = await trx
            .insertInto('chats')
            .values({
                user_id: userId,
                workflow_id: workflowId,
                name,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return Chat.Schema.parse(row);
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(z.object({ chat: Chat.Schema, messages: Chat.Message.Schema.array() }))
    async get(
        trx: DB.UserTransaction,
        userId: Auth.User.Id,
        chatId: Chat.Id,
    ): Promise<{ chat: Chat; messages: Chat.Message[] }> {
        const chat = await trx
            .selectFrom('chats')
            .selectAll()
            .where('id', '=', chatId)
            .where('user_id', '=', userId)
            .executeTakeFirstOrThrow();

        const rows = await trx
            .selectFrom('chat_messages')
            .selectAll()
            .where('chat_id', '=', chatId)
            .orderBy('id')
            .execute();

        return {
            chat: Chat.Schema.parse(chat),
            messages: rows.map((row) => Chat.Message.Schema.parse(row)),
        };
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(Chat.Schema.array())
    async list(trx: DB.UserTransaction, userId: Auth.User.Id): Promise<Chat[]> {
        const rows = await trx
            .selectFrom('chats')
            .selectAll()
            .where('user_id', '=', userId)
            .orderBy('updated_at', 'desc')
            .execute();

        return rows.map((row) => Chat.Schema.parse(row));
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(Chat.Schema.array())
    async listByWorkflow(
        trx: DB.UserTransaction,
        userId: Auth.User.Id,
        workflowId: Workflow.Id,
    ): Promise<Chat[]> {
        const rows = await trx
            .selectFrom('chats')
            .selectAll()
            .where('user_id', '=', userId)
            .where('workflow_id', '=', workflowId)
            .orderBy('updated_at', 'desc')
            .execute();

        return rows.map((row) => Chat.Schema.parse(row));
    }

    @AllowedDatabaseRoles("user", "service")
    @ZodReturn(Chat.Schema)
    async ensure(
        trx: DB.Transaction<'user' | 'service'>,
        userId: Auth.User.Id,
        chatId: Chat.Id,
        workflowId: Workflow.Id,
        name = 'New Chat',
    ): Promise<Chat> {
        const existing = await trx
            .selectFrom('chats')
            .selectAll()
            .where('id', '=', chatId)
            .where('user_id', '=', userId)
            .executeTakeFirst();

        if (existing)
            return Chat.Schema.parse(existing);

        const row = await trx
            .insertInto('chats')
            .values({
                id: chatId,
                user_id: userId,
                workflow_id: workflowId,
                name,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return Chat.Schema.parse(row);
    }

    @AllowedDatabaseRoles("user")
    async erase(
        trx: DB.UserTransaction,
        userId: Auth.User.Id,
        chatId: Chat.Id,
    ): Promise<void> {
        await trx
            .deleteFrom('chat_messages')
            .where('chat_id', '=', chatId)
            .execute();

        await trx
            .deleteFrom('chats')
            .where('id', '=', chatId)
            .where('user_id', '=', userId)
            .execute();
    }
}

@DatabaseClass
class MessageMethods {

    @AllowedDatabaseRoles("user", "service")
    async add(
        trx: DB.Transaction<'user' | 'service'>,
        chatId: Chat.Id,
        messages: Chat.Message[],
    ): Promise<void> {
        if (!messages.length)
            return;

        await trx
            .insertInto('chat_messages')
            .values(messages.map((message) => ({
                id: message.id,
                chat_id: chatId,
                role: message.role,
                content: message.content,
                data: message.data ?? {},
                attachments: message.attachments ?? null,
            })))
            .execute();
    }

    @AllowedDatabaseRoles("user")
    async erase(trx: DB.UserTransaction, messageId: Chat.Message.Id): Promise<void> {
        await trx
            .deleteFrom('chat_messages')
            .where('id', '=', messageId)
            .execute();
    }

    @AllowedDatabaseRoles("user")
    async update(
        trx: DB.UserTransaction,
        messageId: Chat.Message.Id,
        content: string,
    ): Promise<void> {
        await trx
            .updateTable('chat_messages')
            .set({ content })
            .where('id', '=', messageId)
            .execute();
    }

    @AllowedDatabaseRoles("user", "service")
    async updateInChat(
        trx: DB.Transaction<'user' | 'service'>,
        chatId: Chat.Id,
        messageId: Chat.Message.Id,
        content: string,
    ): Promise<void> {
        await trx
            .updateTable('chat_messages')
            .set({ content })
            .where('id', '=', messageId)
            .where('chat_id', '=', chatId)
            .execute();
    }

    @AllowedDatabaseRoles("user", "service")
    @ZodReturn(Chat.Message.Schema.array())
    async list(trx: DB.Transaction<'user' | 'service'>, chatId: Chat.Id): Promise<Chat.Message[]> {
        const rows = await trx
            .selectFrom('chat_messages')
            .selectAll()
            .where('chat_id', '=', chatId)
            .orderBy('id')
            .execute();

        return rows.map((row) => Chat.Message.Schema.parse(row));
    }

    @AllowedDatabaseRoles("user", "service")
    async overwrite(
        trx: DB.Transaction<'user' | 'service'>,
        chatId: Chat.Id,
        messages: Chat.Message[],
    ): Promise<void> {
        await trx
            .deleteFrom('chat_messages')
            .where('chat_id', '=', chatId)
            .execute();

        await this.add(trx, chatId, messages);
    }
}

@Injectable()
@DatabaseClass
export class ChatDatabase {
    public readonly chat = new ChatMethods();
    public readonly message = new MessageMethods();
}
