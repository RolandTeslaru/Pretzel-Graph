import { Injectable } from '@nestjs/common';
import { Principal } from '@/domain/Principal';
import { DB } from '@/db';
import { Chat } from '@pretzel-graph/shared/domain';
import { ChatDatabase } from './chat.database';
import { PermissionService } from '../Permission/permission.service';

@Injectable()
export class ChatService {
    constructor(
        private readonly database: ChatDatabase,
        private readonly ownership: PermissionService,
    ) {}

    async create(
        principal: Principal.User,
        payload: Chat.API.Create.Request
    ): Promise<Chat.API.Create.Response> {
        const { workflow_id, name } = payload;

        // Don't let a chat be attached to a workflow the user doesn't own.
        await this.ownership.assertWorkflow(workflow_id, principal.userId);

        const chat = await DB.asUser(principal, (trx) => this.database.chat.create(trx, principal.userId, workflow_id, name));

        return { chat };
    }

    async ensure(
        principal: Principal.User,
        payload: Chat.API.Ensure.Request
    ): Promise<Chat.API.Ensure.Response> {
        const { chatId, workflow_id, name } = payload;

        await this.ownership.assertWorkflow(workflow_id, principal.userId);

        const chat = await DB.asUser(principal, (trx) => this.database.chat.ensure(trx, principal.userId, chatId, workflow_id, name));
        return { chat };
    }

    async get(
        principal: Principal.User,
        payload: Chat.API.Get.Request
    ): Promise<Chat.API.Get.Response> {
        return DB.asUser(principal, (trx) => this.database.chat.get(trx, principal.userId, payload.chatId));
    }

    async list(
        principal: Principal.User,
    ): Promise<Chat.API.List.Response> {
        const chats = await DB.asUser(principal, (trx) => this.database.chat.list(trx, principal.userId));
        return { chats };
    }

    async listByWorkflow(
        principal: Principal.User,
        payload: Chat.API.ListByWorkflow.Request
    ): Promise<Chat.API.ListByWorkflow.Response> {
        const { workflow_id } = payload;

        await this.ownership.assertWorkflow(workflow_id, principal.userId);

        const chats = await DB.asUser(principal, (trx) => this.database.chat.listByWorkflow(trx, principal.userId, workflow_id));
        return { chats };
    }

    async erase(
        principal: Principal.User,
        payload: Chat.API.Erase.Request
    ): Promise<Chat.API.Erase.Response> {
        await DB.asUser(principal, (trx) => this.database.chat.erase(trx, principal.userId, payload.chatId));

        this.ownership.invalidate(payload.chatId);

        return {};
    }

    public readonly message = {
        add: async (
            principal: Principal.User,
            payload: Chat.API.Message.Add.Request
        ): Promise<Chat.API.Message.Add.Response> => {
            const { chatId, messages } = payload;
            await DB.asUser(principal, (trx) => this.database.message.add(trx, chatId, messages));
            return {};
        },

        erase: async (
            principal: Principal.User,
            payload: Chat.API.Message.Erase.Request
        ): Promise<Chat.API.Message.Erase.Response> => {
            await DB.asUser(principal, (trx) => this.database.message.erase(trx, payload.messageId));
            return {};
        },

        update: async (
            principal: Principal.User,
            payload: Chat.API.Message.Update.Request
        ): Promise<Chat.API.Message.Update.Response> => {
            const { messageId, content } = payload;
            await DB.asUser(principal, (trx) => this.database.message.update(trx, messageId, content));
            return {};
        }
    };
}
