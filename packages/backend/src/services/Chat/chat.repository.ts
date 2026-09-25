import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Chat, Workflow } from '@pretzel-graph/shared/domain';
import { Principal } from '@/domain/Principal';
import { Repository, Transactional } from '@/db/repository';
import { ZodReturn } from '@/decorators/database';

class ChatMethods extends Repository {

    @Transactional('user')
    @ZodReturn(Chat.Schema)
    public async create(
        principal: Principal.User,
        workflowId: Workflow.Id,
        name = 'New Chat',
    ): Promise<Chat> {
        const row = await this.trx
            .insertInto('chats')
            .values({
                created_by: principal.userId,
                workflow_id: workflowId,
                name,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return Chat.Schema.parse(row);
    }

    @Transactional('user', 'service')
    @ZodReturn(Chat.Schema.nullable())
    public async findByExternalKey(
        principal: Principal.User | Principal.Service,
        workflowId: Workflow.Id,
        externalKey: Chat.ExternalKey,
    ): Promise<Chat | null> {
        const row = await this.trx
            .selectFrom('chats')
            .selectAll()
            .where('workflow_id', '=', workflowId)
            .where('external_key', '=', externalKey)
            .executeTakeFirst();

        return row ? Chat.Schema.parse(row) : null;
    }

    @Transactional('user')
    @ZodReturn(z.object({ chat: Chat.Schema, messages: Chat.Message.Schema.array() }))
    public async get(
        principal: Principal.User,
        chatId: Chat.Id,
    ): Promise<{ chat: Chat; messages: Chat.Message[] }> {
        const chat = await this.trx
            .selectFrom('chats')
            .selectAll()
            .where('id', '=', chatId)
            .executeTakeFirstOrThrow();

        const rows = await this.trx
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

    @Transactional('user')
    @ZodReturn(Chat.Schema.array())
    public async list(principal: Principal.User): Promise<Chat[]> {
        const rows = await this.trx
            .selectFrom('chats')
            .selectAll()
            .orderBy('updated_at', 'desc')
            .execute();

        return rows.map((row) => Chat.Schema.parse(row));
    }

    @Transactional('user')
    @ZodReturn(Chat.Schema.array())
    public async listByWorkflow(
        principal: Principal.User,
        workflowId: Workflow.Id,
    ): Promise<Chat[]> {
        const rows = await this.trx
            .selectFrom('chats')
            .selectAll()
            .where('workflow_id', '=', workflowId)
            .orderBy('updated_at', 'desc')
            .execute();

        return rows.map((row) => Chat.Schema.parse(row));
    }

    // A service principal leaves the chat ownerless.
    @Transactional('user', 'service')
    @ZodReturn(Chat.Schema)
    public async ensure(
        principal: Principal.User | Principal.Service,
        chatId: Chat.Id,
        workflowId: Workflow.Id,
        name = 'New Chat',
    ): Promise<Chat> {
        const existing = await this.trx
            .selectFrom('chats')
            .selectAll()
            .where('id', '=', chatId)
            .executeTakeFirst();

        if (existing)
            return Chat.Schema.parse(existing);

        const row = await this.trx
            .insertInto('chats')
            .values({
                id: chatId,
                created_by: principal.type === 'user' ? principal.userId : null,
                workflow_id: workflowId,
                name,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return Chat.Schema.parse(row);
    }

    @Transactional('user')
    public async erase(
        principal: Principal.User,
        chatId: Chat.Id,
    ): Promise<void> {
        await this.trx
            .deleteFrom('chat_messages')
            .where('chat_id', '=', chatId)
            .execute();

        await this.trx
            .deleteFrom('chats')
            .where('id', '=', chatId)
            .execute();
    }
}

class MessageMethods extends Repository {

    @Transactional('user', 'delegate')
    public async add(
        principal: Principal.User | Principal.Delegate,
        chatId: Chat.Id,
        messages: Chat.Message[],
    ): Promise<void> {
        await this._insert(chatId, messages);
    }

    // Upserts the workflow's chat for the external key, then appends to it.
    @Transactional('service')
    public async appendByExternalKey(
        principal: Principal.Service,
        workflowId: Workflow.Id,
        externalKey: Chat.ExternalKey,
        messages: Chat.Message[],
        name = 'New Chat',
    ): Promise<Chat.Id> {
        const chat = await this.trx
            .insertInto('chats')
            .values({
                workflow_id:  workflowId,
                external_key: externalKey,
                name,
            })
            // The unique index is partial, and Postgres only infers one when given its predicate.
            .onConflict(conflict => conflict
                .columns(['workflow_id', 'external_key'])
                .where('external_key', 'is not', null)
                .doUpdateSet({ updated_at: new Date().toISOString() }))
            .returning('id')
            .executeTakeFirstOrThrow();

        await this._insert(chat.id, messages);

        return chat.id;
    }

    @Transactional('user')
    public async erase(principal: Principal.User, messageId: Chat.Message.Id): Promise<void> {
        await this.trx
            .deleteFrom('chat_messages')
            .where('id', '=', messageId)
            .execute();
    }

    @Transactional('user')
    public async update(
        principal: Principal.User,
        messageId: Chat.Message.Id,
        content: string,
    ): Promise<void> {
        await this.trx
            .updateTable('chat_messages')
            .set({ content })
            .where('id', '=', messageId)
            .execute();
    }

    @Transactional('user', 'delegate')
    public async updateInChat(
        principal: Principal.User | Principal.Delegate,
        chatId: Chat.Id,
        messageId: Chat.Message.Id,
        content: string,
    ): Promise<void> {
        await this.trx
            .updateTable('chat_messages')
            .set({ content })
            .where('id', '=', messageId)
            .where('chat_id', '=', chatId)
            .execute();
    }

    @Transactional('user', 'delegate')
    @ZodReturn(Chat.Message.Schema.array())
    public async list(
        principal: Principal.User | Principal.Delegate,
        chatId: Chat.Id,
    ): Promise<Chat.Message[]> {
        const rows = await this.trx
            .selectFrom('chat_messages')
            .selectAll()
            .where('chat_id', '=', chatId)
            .orderBy('id')
            .execute();

        return rows.map((row) => Chat.Message.Schema.parse(row));
    }

    @Transactional('user', 'delegate')
    public async overwrite(
        principal: Principal.User | Principal.Delegate,
        chatId: Chat.Id,
        messages: Chat.Message[],
    ): Promise<void> {
        await this.trx
            .deleteFrom('chat_messages')
            .where('chat_id', '=', chatId)
            .execute();

        await this._insert(chatId, messages);
    }

    private async _insert(chatId: Chat.Id, messages: Chat.Message[]): Promise<void> {
        if (!messages.length)
            return;

        await this.trx
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
}

@Injectable()
export class ChatRepository {
    public readonly chat = new ChatMethods();
    public readonly message = new MessageMethods();
}
