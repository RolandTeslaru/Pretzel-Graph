import { Injectable } from '@nestjs/common';
import { createAuthenticatedClient } from '@/utils/supabase';
import { Library, Workflow } from '@vx-agent-editor/shared/domain';
import { SupabaseClient } from '@supabase/supabase-js';
import { withSupabaseAssert } from '@vx-agent-editor/shared/errors/supabase';

@Injectable()
export class LibraryService {

    private readonly dbOps = {
        workflow: {
            create: withSupabaseAssert('workflow.create', async (supabase: SupabaseClient, payload: Library.API.Workflow.Create.Request) => {
                const { data } = await supabase
                    .from('workflows')
                    .upsert(payload)
                    .select()
                    .single()
                    .throwOnError();

                return data!;
            }),
            get: withSupabaseAssert('workflow.get', async (supabase: SupabaseClient, workflowId: Workflow.Id) => {
                const { data } = await supabase
                    .from('workflows')
                    .select('*')
                    .eq('id', workflowId)
                    .single()
                    .throwOnError();

                return data!;
            }),
            list: withSupabaseAssert('workflow.list', async (supabase: SupabaseClient, folderId?: Library.Folder.Id) => {
                let query = supabase
                    .from('workflows')
                    .select('id, user_id, display_name, description, locked, mcp_enabled, created_at, updated_at')

                if (folderId) {
                    // If we re-introduce folders, query here
                }

                const { data } = await query.throwOnError();
                return data ?? [];
            })
        }
    };


    async createWorkflow(
        token: string,
        payload: Library.API.Workflow.Create.Request
    ): Promise<Library.API.Workflow.Create.Response> {
        const supabase = createAuthenticatedClient(token);
        return await this.dbOps.workflow.create(supabase, payload);
    }


    async getWorkflow(
        token: string,
        workflowId: Workflow.Id
    ): Promise<Library.API.Workflow.Get.Response> {
        const supabase = createAuthenticatedClient(token);
        return await this.dbOps.workflow.get(supabase, workflowId);
    }


    async listWorkflows(
        token: string,
        folderId?: Library.Folder.Id
    ): Promise<Library.API.Workflow.List.Response> {
        const supabase = createAuthenticatedClient(token);
        return await this.dbOps.workflow.list(supabase, folderId);
    }
}