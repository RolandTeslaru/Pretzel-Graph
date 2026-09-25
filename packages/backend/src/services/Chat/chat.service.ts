import { Injectable } from '@nestjs/common';
import { Principal } from '@/domain/Principal';
import { Chat, Workflow } from '@pretzel-graph/shared/domain';
import { ChatRepository } from './chat.repository';

@Injectable()
export class ChatService {
    constructor(
        private readonly repository: ChatRepository,
    ) {}

    // Appends to the workflow's chat for `externalKey`, opening it on the first write. Runs with no
    // acting user: a gateway event belongs to the workflow, not to whoever published it.
    async appendByExternalKey(
        workflowId:  Workflow.Id,
        externalKey: Chat.ExternalKey,
        messages:    Chat.Message[],
    ): Promise<Chat.Id> {
        return this.repository.message.appendByExternalKey(Principal.SELF, workflowId, externalKey, messages);
    }

    // The chat opened under an external key, or null before its first write.
    async findIdByExternalKey(
        workflowId:  Workflow.Id,
        externalKey: Chat.ExternalKey,
    ): Promise<Chat.Id | null> {
        const chat = await this.repository.chat.findByExternalKey(Principal.SELF, workflowId, externalKey);

        return chat?.id ?? null;
    }

    // The FK rejects a workflow that does not exist.
    async create(
        principal:   Principal.User,
        workflow_id: Workflow.Id,
        payload:     Chat.API.Create.Request
    ): Promise<Chat.API.Create.Response> {
        const { name } = payload;

        const chat = await this.repository.chat.create(principal, workflow_id, name);

        return { chat };
    }

    // chatId is a proposed id — the row may not exist yet. A service principal leaves it ownerless.
    async ensure(
        principal:   Principal.User | Principal.Service,
        workflow_id: Workflow.Id,
        payload:     Chat.API.Ensure.Request
    ): Promise<Chat.API.Ensure.Response> {
        const { chatId, name } = payload;

        const chat = await this.repository.chat.ensure(principal, chatId, workflow_id, name);
        return { chat };
    }

    // Get.Request's cursor and limit are declared but unread — the query does not paginate.
    async get(
        principal: Principal.User,
        chatId:    Chat.Id,
    ): Promise<Chat.API.Get.Response> {
        return this.repository.chat.get(principal, chatId);
    }

    async list(
        principal: Principal.User,
    ): Promise<Chat.API.List.Response> {
        const chats = await this.repository.chat.list(principal);
        return { chats };
    }

    async listByWorkflow(
        principal:   Principal.User,
        workflow_id: Workflow.Id,
    ): Promise<Chat.API.ListByWorkflow.Response> {

        const chats = await this.repository.chat.listByWorkflow(principal, workflow_id);
        return { chats };
    }

    async erase(
        principal: Principal.User,
        chatId:    Chat.Id,
    ): Promise<Chat.API.Erase.Response> {
        await this.repository.chat.erase(principal, chatId);


        return {};
    }

    public readonly message = {
        add: async (
            principal: Principal.User,
            chatId:    Chat.Id,
            payload:   Chat.API.Message.Add.Request
        ): Promise<Chat.API.Message.Add.Response> => {
            const { messages } = payload;
            await this.repository.message.add(principal, chatId, messages);
            return {};
        },

        erase: async (
            principal: Principal.User,
            payload: Chat.API.Message.Erase.Request
        ): Promise<Chat.API.Message.Erase.Response> => {
            await this.repository.message.erase(principal, payload.messageId);
            return {};
        },

        update: async (
            principal: Principal.User,
            payload: Chat.API.Message.Update.Request
        ): Promise<Chat.API.Message.Update.Response> => {
            const { messageId, content } = payload;
            await this.repository.message.update(principal, messageId, content);
            return {};
        }
    };
}
