import { Injectable } from '@nestjs/common';
import { createAuthenticatedClient, getUserId } from '@/utils/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { withSupabaseAssert } from '@pretzel-graph/shared/errors/supabase';
import { Workflow, Workbench } from '@pretzel-graph/shared/domain';

@Injectable()
export class WorkbenchDatabase {
    public readonly workflow = {
        create: withSupabaseAssert('workbench.workflow.create', async (
            supabase: SupabaseClient,
            payload: Workbench.API.Workflow.Create.Request,
        ) => {
            const workflow = payload.workflow;
            const user_id = await getUserId(supabase);
            if (!user_id) throw new Error('Unauthenticated');

            const { data: row } = await supabase
                .from('workflows')
                .insert({
                    folder_id: workflow.folder_id,
                    display_name: workflow.display_name,
                    description: workflow.description,
                    locked: workflow.locked,
                    mcp_enabled: false,
                    data: workflow.data,
                    user_id: user_id,
                })
                .select('id')
                .single<{ id: Workflow.Id }>()
                .throwOnError();

            return row.id;
        }),

        get: withSupabaseAssert('workbench.workflow.get', async (
            supabase: SupabaseClient,
            workflowId: Workflow.Id,
        ) => {
            const { data: row } = await supabase
                .from('workflows')
                .select('*')
                .eq('id', workflowId)
                .single<Workflow.Database.Row>()
                .throwOnError();

            return Workflow.Schema.parse(row);
        }),

        commit: withSupabaseAssert('workbench.workflow.commit', async (
            supabase: SupabaseClient,
            payload: Workbench.API.Workflow.Commit.Request,
        ) => {
            const workflowId = payload.workflow.id;
            await supabase
                .from('workflows')
                .update(payload.workflow)
                .eq('id', workflowId)
                .throwOnError();
        }),
    };
}
