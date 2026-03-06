"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionSessionService = void 0;
const common_1 = require("@nestjs/common");
const supabase_1 = require("@/utils/supabase");
let ExecutionSessionService = class ExecutionSessionService {
    constructor() {
        this.dbOps = {
            create: async (supabase, session) => {
                const { data, error } = await supabase
                    .from('execution_sessions')
                    .insert(session)
                    .select('id')
                    .single();
                if (error)
                    throw error;
                return data.id;
            },
            get: async (supabase, sessionId) => {
                const { data, error } = await supabase
                    .from('execution_sessions')
                    .select('*')
                    .eq('id', sessionId)
                    .single();
                if (error)
                    throw error;
                return data;
            },
            update: async (supabase, sessionId, updates) => {
                const { data, error } = await supabase
                    .from('execution_sessions')
                    .update(updates)
                    .eq('id', sessionId)
                    .select()
                    .single();
                if (error)
                    throw error;
                return data;
            }
        };
    }
    async create(token, payload) {
        const supabase = (0, supabase_1.createAuthenticatedClient)(token);
        const { workflowId, session } = payload;
        await this.dbOps.create(supabase, session);
        return { session };
    }
    async get(token, payload) {
        const supabase = (0, supabase_1.createAuthenticatedClient)(token);
        const { id } = payload;
        const session = await this.dbOps.get(supabase, id);
        return { session };
    }
    async update(token, payload) {
        const supabase = (0, supabase_1.createAuthenticatedClient)(token);
        const { id, session } = payload;
        const updatedSession = await this.dbOps.update(supabase, id, session);
        return { session: updatedSession };
    }
};
exports.ExecutionSessionService = ExecutionSessionService;
exports.ExecutionSessionService = ExecutionSessionService = __decorate([
    (0, common_1.Injectable)()
], ExecutionSessionService);
