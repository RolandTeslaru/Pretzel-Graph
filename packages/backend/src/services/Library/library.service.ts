import { Injectable } from '@nestjs/common';
import { createAuthenticatedClient } from '@/utils/supabase';
import { Library, Workflow } from '@vx-agent-editor/shared/domain';

@Injectable()
export class LibraryService {


    async createWorkflow(
        token: string, 
        payload: Library.API.Workflow.Create.Request
    ): Promise<Library.API.Workflow.Create.Response> {
        const supabase = createAuthenticatedClient(token);

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


    async getWorkflow(
        token: string,
        workflowId: Workflow.Id
    ): Promise<Library.API.Workflow.Get.Response> {
        const supabase = createAuthenticatedClient(token);

        const { data, error } = await supabase
            .from('workflows')
            .select('*')
            .eq('id', workflowId)
            .single();

        if (error) throw new Error(error.message);
        return data;
    }


    async listWorkflows(
        token: string, 
        folderId?: Library.Folder.Id
    ): Promise<Library.API.Workflow.List.Response> {
        const supabase = createAuthenticatedClient(token);

        let query = supabase
            .from('workflows')
            .select('id, user_id, display_name, description, locked, mcp_enabled, created_at, updated_at')

        if (folderId) {
            // If we re-introduce folders, query here
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        return data;
    }
}
