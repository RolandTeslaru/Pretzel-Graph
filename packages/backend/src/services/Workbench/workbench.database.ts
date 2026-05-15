import { Injectable } from '@nestjs/common';
import { getUserId } from '@/utils/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { withSupabaseAssert } from '@pretzel-graph/shared/errors/supabase';
import { SystemError, VersionControl, Workflow, Workbench } from '@pretzel-graph/shared/domain';

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
            await supabase
                .from('workflows')
                .update({ data: payload.data })
                .eq('id', payload.workflowId)
                .throwOnError();
        }),
    };

    public readonly dependency = {
        load: withSupabaseAssert('workbench.dependency.load', async (
            supabase: SupabaseClient,
            workflowId: Workflow.Id,
        ): Promise<Workflow.Dependency> => {
            const requesterId = await getUserId(supabase);
            if (!requesterId) throw new Error('Unauthenticated');

            const { data: workflow } = await supabase
                .from('workflows')
                .select('id, user_id, is_public, display_name, icon, accent')
                .eq('id', workflowId)
                .maybeSingle<Pick<Workflow.Database.Row, 'id' | 'user_id' | 'is_public' | 'display_name' | 'icon' | 'accent'>>()
                .throwOnError();

            if (!workflow || (workflow.user_id !== requesterId && !workflow.is_public))
                throw new SystemError(SystemError.Code.NOT_FOUND, 'Workflow not found or not public');

            const { data: row } = await supabase
                .from('version_control')
                .select('*')
                .eq('workflow_id', workflowId)
                .eq('is_active', true)
                .maybeSingle()
                .throwOnError();

            if (!row)
                throw new SystemError(SystemError.Code.NOT_FOUND, 'No active publication found for this public workflow');

            const publication = VersionControl.Publication.Schema.parse(row);

            return Workflow.Dependency.Schema.parse({
                ...publication,
                publication_name: publication.name,
                display_name:     workflow.display_name,
                icon:             workflow.icon,
                accent:           workflow.accent,
            });
        }),

        checkUpdates: withSupabaseAssert('workbench.dependency.checkUpdates', async (
            supabase: SupabaseClient,
            dependencies: Workbench.API.Dependency.CheckUpdates.Request["dependencies"],
        ): Promise<Record<Workflow.Id, Workflow.Dependency.UpdateInfo>> => {
            if (dependencies.length === 0) return {};

            const workflowIds = dependencies.map(d => d.workflowId);
            const currentPublicationById = new Map(dependencies.map(d => [d.workflowId, d.publicationId]));

            const { data: rows } = await supabase
                .from('version_control')
                .select('id, workflow_id, version, name, description')
                .in('workflow_id', workflowIds)
                .eq('is_active', true)
                .throwOnError();

            const updates: Record<Workflow.Id, Workflow.Dependency.UpdateInfo> = {};
            for (const row of rows ?? []) {
                const stored = currentPublicationById.get(row.workflow_id as Workflow.Id);
                if (stored && stored !== row.id)
                    updates[row.workflow_id as Workflow.Id] = {
                        workflowId:    row.workflow_id as Workflow.Id,
                        publicationId: row.id,
                        version:       row.version,
                        name:          row.name,
                        description:   row.description ?? null,
                    };
            }

            return updates;
        }),
    };
}
