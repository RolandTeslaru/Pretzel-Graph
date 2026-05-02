import { Chat } from "@pretzel-graph/shared/domain";
import { AxiosService } from "../../services/AxiosService";

export const InternalChatAPI = {
    messageAdd: (payload: Chat.API.Message.Add.Request) =>
        AxiosService.api.post('/api/internal/chat/message/add', payload),
    messageUpdate: (payload: Chat.API.Message.Update.Request) =>
        AxiosService.api.post('/api/internal/chat/message/update', payload),
    messageList: (chatId: Chat.Id) =>
        AxiosService.api.post<{ messages: Chat.Message[] }>('/api/internal/chat/message/list', { chatId }),
    messageOverwrite: (chatId: Chat.Id, messages: Chat.Message[]) =>
        AxiosService.api.post('/api/internal/chat/message/overwrite', { chatId, messages }),
};
