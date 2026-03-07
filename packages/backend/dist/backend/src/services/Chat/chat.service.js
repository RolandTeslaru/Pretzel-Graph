"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const supabase_1 = require("@/utils/supabase");
const execution_session_service_1 = require("../ExecutionSession/execution-session.service");
let ChatService = class ChatService {
    constructor(executionSessionService) {
        this.executionSessionService = executionSessionService;
        this.dbOps = {
            chat: {
                create: async (supabase, userId, workflow_id, execution_session_id, name = "New Chat") => {
                    const { data, error } = await supabase
                        .from('chats')
                        .insert({
                        user_id: userId,
                        workflow_id,
                        name: name ?? "New Chat",
                        execution_session_id,
                        created_at: new Date(),
                        updated_at: new Date(),
                    })
                        .select('id')
                        .single();
                    this.assertSupabaseOk(error, "chat.create");
                    if (!data?.id) {
                        throw new Error("[ChatService:chat.create] Missing inserted chat id");
                    }
                    return {
                        id: data.id,
                        workflow_id: workflow_id,
                        name: name ?? "New Chat",
                        execution_session_id,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                },
                get: async (supabase, chatId) => {
                    const { data, error } = await supabase
                        .from('chats')
                        .select('id, user_id, workflow_id, name, created_at, updated_at, execution_session_id, chat_messages(*)')
                        .eq('id', chatId)
                        .order('created_at', { referencedTable: 'chat_messages', ascending: true })
                        .single();
                    this.assertSupabaseOk(error, "chat.get");
                    if (!data) {
                        throw new Error("[ChatService:chat.get] Chat not found");
                    }
                    const { chat_messages, ...chat } = data;
                    return {
                        chat,
                        messages: chat_messages ?? []
                    };
                },
                list: async (supabase, userId) => {
                    const { data, error } = await supabase
                        .from('chats')
                        .select('*')
                        .eq('user_id', userId)
                        .order('updated_at', { ascending: false });
                    this.assertSupabaseOk(error, "chat.list");
                    return data ?? [];
                },
                erase: async (supabase, chatId) => {
                    const { error } = await supabase.from('chats').delete().eq('id', chatId);
                    this.assertSupabaseOk(error, "chat.erase");
                },
            },
            message: {
                add: async (supabase, message) => {
                    const { error } = await supabase.from('chat_messages').insert({
                        id: message.id,
                        chat_id: message.chat_id,
                        role: message.role,
                        content: message.content,
                        data: message.data ?? {},
                        attachments: message.attachments ?? null,
                        created_at: new Date(),
                    });
                    this.assertSupabaseOk(error, "message.add");
                },
                erase: async (supabase, messageId) => {
                    const { error } = await supabase.from('chat_messages').delete().eq('id', messageId);
                    this.assertSupabaseOk(error, "message.erase");
                },
                update: async (supabase, messageId, content) => {
                    const { error } = await supabase
                        .from('chat_messages')
                        .update({ content })
                        .eq('id', messageId);
                    console.log("Updating message", messageId, "with content", content, "errror", error);
                    this.assertSupabaseOk(error, "message.update");
                }
            }
        };
        this.message = {
            send: async (token, payload) => {
                const supabase = (0, supabase_1.createAuthenticatedClient)(token);
                const { message } = payload;
                await this.dbOps.message.add(supabase, message);
                return {};
            },
            respond: async (token, payload) => {
                const supabase = (0, supabase_1.createAuthenticatedClient)(token);
                const { responseMessage } = payload;
                await this.dbOps.message.add(supabase, responseMessage);
                return {};
            },
            erase: async (token, payload) => {
                const supabase = (0, supabase_1.createAuthenticatedClient)(token);
                await this.dbOps.message.erase(supabase, payload.messageId);
                return {};
            },
            update: async (token, payload) => {
                const supabase = (0, supabase_1.createAuthenticatedClient)(token);
                const { messageId, content } = payload;
                await this.dbOps.message.update(supabase, messageId, content);
                return {};
            }
        };
    }
    assertSupabaseOk(error, operation) {
        if (!error)
            return;
        const message = typeof error === "object" && error !== null && "message" in error
            ? String(error.message ?? "Unknown Supabase error")
            : "Unknown Supabase error";
        throw new Error(`[ChatService:${operation}] ${message}`);
    }
    async create(token, payload) {
        const supabase = (0, supabase_1.createAuthenticatedClient)(token);
        const { workflow_id, name, execution_session } = payload;
        const userId = await (0, supabase_1.getUserId)(supabase);
        if (!userId)
            throw new Error("User not found");
        // Ensure the execution session exists in the DB (insert if missing, update if existing)
        await this.executionSessionService.dbOps.upsert(supabase, userId, execution_session);
        const chat = await this.dbOps.chat.create(supabase, userId, workflow_id, execution_session.id, name);
        return { chat };
    }
    async get(token, payload) {
        const supabase = (0, supabase_1.createAuthenticatedClient)(token);
        return await this.dbOps.chat.get(supabase, payload.chatId);
    }
    async list(token) {
        const supabase = (0, supabase_1.createAuthenticatedClient)(token);
        const userId = await (0, supabase_1.getUserId)(supabase);
        if (!userId)
            throw new Error("User not found");
        const chats = await this.dbOps.chat.list(supabase, userId);
        return { chats };
    }
    async erase(token, payload) {
        const supabase = (0, supabase_1.createAuthenticatedClient)(token);
        await this.dbOps.chat.erase(supabase, payload.chatId);
        return {};
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [execution_session_service_1.ExecutionSessionService])
], ChatService);
