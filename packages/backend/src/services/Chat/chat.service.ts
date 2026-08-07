import { Injectable } from '@nestjs/common';
import { Principal } from '@/domain/Principal';
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

        const chat = await this.database.chat.create(
            principal.supabase, principal.userId, workflow_id, name
        );

        return { chat };
    }

    async ensure(
        principal: Principal.User,
        payload: Chat.API.Ensure.Request
    ): Promise<Chat.API.Ensure.Response> {
        const { chatId, workflow_id, name } = payload;

        await this.ownership.assertWorkflow(workflow_id, principal.userId);

        const chat = await this.database.chat.ensure(principal.supabase, principal.userId, chatId, workflow_id, name);
        return { chat };
    }

    async get(
        principal: Principal.User,
        payload: Chat.API.Get.Request
    ): Promise<Chat.API.Get.Response> {
        return await this.database.chat.get(principal.supabase, principal.userId, payload.chatId);
    }

    async list(
        principal: Principal.User,
    ): Promise<Chat.API.List.Response> {
        const chats = await this.database.chat.list(principal.supabase, principal.userId);
        return { chats };
    }

    async listByWorkflow(
        principal: Principal.User,
        payload: Chat.API.ListByWorkflow.Request
    ): Promise<Chat.API.ListByWorkflow.Response> {
        const { workflow_id } = payload;

        await this.ownership.assertWorkflow(workflow_id, principal.userId);

        const chats = await this.database.chat.listByWorkflow(principal.supabase, principal.userId, workflow_id);
        return { chats };
    }

    async erase(
        principal: Principal.User,
        payload: Chat.API.Erase.Request
    ): Promise<Chat.API.Erase.Response> {
        await this.database.chat.erase(principal.supabase, principal.userId, payload.chatId);
        return {};
    }

    public readonly message = {
        add: async (
            principal: Principal.User,
            payload: Chat.API.Message.Add.Request
        ): Promise<Chat.API.Message.Add.Response> => {
            const { chatId, messages } = payload;
            await this.database.message.add(principal.supabase, chatId, messages);
            return {};
        },

        erase: async (
            principal: Principal.User,
            payload: Chat.API.Message.Erase.Request
        ): Promise<Chat.API.Message.Erase.Response> => {
            await this.database.message.erase(principal.supabase, payload.messageId);
            return {};
        },

        update: async (
            principal: Principal.User,
            payload: Chat.API.Message.Update.Request
        ): Promise<Chat.API.Message.Update.Response> => {
            const { messageId, content } = payload;
            await this.database.message.update(principal.supabase, messageId, content);
            return {};
        }
    };
}
