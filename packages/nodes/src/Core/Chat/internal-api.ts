import { Chat, Execution } from "@pretzel-graph/shared/domain";
import { AxiosService } from "../../services/AxiosService";

export const InternalChatAPI = {
    messageAdd: (executionId: Execution.Id, payload: Chat.API.Message.Add.Request) =>
        AxiosService.api.post('/api/internal/chat/message/add', { executionId, ...payload }),
    messageUpdate: (executionId: Execution.Id, chatId: Chat.Id, payload: Chat.API.Message.Update.Request) =>
        AxiosService.api.post('/api/internal/chat/message/update', { executionId, chatId, ...payload }),
    messageList: (executionId: Execution.Id, chatId: Chat.Id) =>
        AxiosService.api.post<{ messages: Chat.Message[] }>('/api/internal/chat/message/list', { executionId, chatId }),
    messageOverwrite: (executionId: Execution.Id, chatId: Chat.Id, messages: Chat.Message[]) =>
        AxiosService.api.post('/api/internal/chat/message/overwrite', { executionId, chatId, messages }),
};
