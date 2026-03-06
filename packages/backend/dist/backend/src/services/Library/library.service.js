"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibraryService = void 0;
const common_1 = require("@nestjs/common");
const supabase_1 = require("@/utils/supabase");
let LibraryService = class LibraryService {
    async createWorkflow(token, payload) {
        const supabase = (0, supabase_1.createAuthenticatedClient)(token);
        const { data: result, error } = await supabase
            .from('workflows')
            .upsert(payload)
            .select()
            .single();
        if (error) {
            console.error("Supabase Upsert Error:", error);
            throw new Error(error.message);
        }
        return result;
    }
    async getWorkflow(token, workflowId) {
        const supabase = (0, supabase_1.createAuthenticatedClient)(token);
        const { data, error } = await supabase
            .from('workflows')
            .select('*')
            .eq('id', workflowId)
            .single();
        if (error)
            throw new Error(error.message);
        return data;
    }
    async listWorkflows(token, folderId) {
        const supabase = (0, supabase_1.createAuthenticatedClient)(token);
        let query = supabase
            .from('workflows')
            .select('id, user_id, display_name, description, locked, mcp_enabled, created_at, updated_at');
        if (folderId) {
            // If we re-introduce folders, query here
        }
        const { data, error } = await query;
        if (error)
            throw new Error(error.message);
        return data;
    }
};
exports.LibraryService = LibraryService;
exports.LibraryService = LibraryService = __decorate([
    (0, common_1.Injectable)()
], LibraryService);
