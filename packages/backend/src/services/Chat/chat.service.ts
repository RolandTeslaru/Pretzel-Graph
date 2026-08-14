import { Injectable } from '@nestjs/common';
import { Principal } from '@/domain/Principal';
import { DB } from '@/db';
import { Chat, Workflow } from '@pretzel-graph/shared/domain';
import { ChatDatabase } from './chat.database';

@Injectable()
export class ChatService {
    constructor(
        private readonly database: ChatDatabase,
    ) {}

    // The FK rejects a workflow that does not exist.
    async create(
        principal:   Principal.User,
        workflow_id: Workflow.Id,
        payload:     Chat.API.Create.Request
    ): Promise<Chat.API.Create.Response> {
        const { name } = payload;

        const chat = await DB.asUser(principal, (trx) => this.database.chat.create(trx, principal.userId, workflow_id, name));

        return { chat };
    }

    // chatId is a proposed id — the row may not exist yet.
    async ensure(
        principal:   Principal.User,
        workflow_id: Workflow.Id,
        payload:     Chat.API.Ensure.Request
    ): Promise<Chat.API.Ensure.Response> {
        const { chatId, name } = payload;

        const chat = await DB.asUser(principal, (trx) => this.database.chat.ensure(trx, principal.userId, chatId, workflow_id, name));
        return { chat };
    }

    // Get.Request's cursor and limit are declared but unread — the query does not paginate.
    async get(
        principal: Principal.User,
        chatId:    Chat.Id,
    ): Promise<Chat.API.Get.Response> {
        return DB.asUser(principal, (trx) => this.database.chat.get(trx, chatId));
    }

    async list(
        principal: Principal.User,
    ): Promise<Chat.API.List.Response> {
        const chats = await DB.asUser(principal, (trx) => this.database.chat.list(trx));
        return { chats };
    }

    async listByWorkflow(
        principal:   Principal.User,
        workflow_id: Workflow.Id,
    ): Promise<Chat.API.ListByWorkflow.Response> {

        const chats = await DB.asUser(principal, (trx) => this.database.chat.listByWorkflow(trx, workflow_id));
        return { chats };
    }

    async erase(
        principal: Principal.User,
        chatId:    Chat.Id,
    ): Promise<Chat.API.Erase.Response> {
        await DB.asUser(principal, (trx) => this.database.chat.erase(trx, chatId));


        return {};
    }

    public readonly message = {
        add: async (
            principal: Principal.User,
            chatId:    Chat.Id,
            payload:   Chat.API.Message.Add.Request
        ): Promise<Chat.API.Message.Add.Response> => {
            const { messages } = payload;
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
