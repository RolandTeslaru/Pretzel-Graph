import { Injectable } from '@nestjs/common';
import { createAuthenticatedClient } from '@/utils/supabase';
import { Auth, Chat } from '@pretzel-graph/shared/domain';
import { ChatDatabase } from './chat.database';
import { PermissionService } from '../Permission/permission.service';

@Injectable()
export class ChatService {
    constructor(
        private readonly database: ChatDatabase,
        private readonly ownership: PermissionService,
    ) {}

    async create(
        token: string,
        userId: Auth.User.Id,
        payload: Chat.API.Create.Request
    ): Promise<Chat.API.Create.Response> {
        const supabase = createAuthenticatedClient(token);
        const { workflow_id, name } = payload;

        // Don't let a chat be attached to a workflow the user doesn't own.
        await this.ownership.assertWorkflow(workflow_id, userId);

        const chat = await this.database.chat.create(
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

        await this.ownership.assertWorkflow(workflow_id, userId);

        const chat = await this.database.chat.ensure(supabase, userId, chatId, workflow_id, name);
        return { chat };
    }

    async get(
        token: string,
        userId: Auth.User.Id,
        payload: Chat.API.Get.Request
    ): Promise<Chat.API.Get.Response> {
        const supabase = createAuthenticatedClient(token);
        return await this.database.chat.get(supabase, userId, payload.chatId);
    }

    async list(
        token: string,
        userId: Auth.User.Id
    ): Promise<Chat.API.List.Response> {
        const supabase = createAuthenticatedClient(token);
        const chats = await this.database.chat.list(supabase, userId);
        return { chats };
    }

    async listByWorkflow(
        token: string,
        userId: Auth.User.Id,
        payload: Chat.API.ListByWorkflow.Request
    ): Promise<Chat.API.ListByWorkflow.Response> {
        const supabase = createAuthenticatedClient(token);
        const { workflow_id } = payload;

        await this.ownership.assertWorkflow(workflow_id, userId);

        const chats = await this.database.chat.listByWorkflow(supabase, userId, workflow_id);
        return { chats };
    }

    async erase(
        token: string,
        userId: Auth.User.Id,
        payload: Chat.API.Erase.Request
    ): Promise<Chat.API.Erase.Response> {
        const supabase = createAuthenticatedClient(token);
        await this.database.chat.erase(supabase, userId, payload.chatId);
        return {};
    }

    public readonly message = {
        add: async (
            token: string,
            payload: Chat.API.Message.Add.Request
        ): Promise<Chat.API.Message.Add.Response> => {
            const supabase = createAuthenticatedClient(token);
            const { chatId, messages } = payload;
            await this.database.message.add(supabase, chatId, messages);
            return {};
        },

        erase: async (
            token: string,
            payload: Chat.API.Message.Erase.Request
        ): Promise<Chat.API.Message.Erase.Response> => {
            const supabase = createAuthenticatedClient(token);
            await this.database.message.erase(supabase, payload.messageId);
            return {};
        },

        update: async (
            token: string,
            payload: Chat.API.Message.Update.Request
        ): Promise<Chat.API.Message.Update.Response> => {
            const supabase = createAuthenticatedClient(token);
            const { messageId, content } = payload;
            await this.database.message.update(supabase, messageId, content);
            return {};
        }
    };
}
