import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { getUserId } from '@/utils/supabase';
import { VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { SupabaseAssert, ZodReturn } from '../../decorators/database';
import { z } from 'zod';

@Injectable()
export class VersionControlDatabase {

    @SupabaseAssert('publication.publish')
    @ZodReturn(VersionControl.Publication.Schema)
    async publish(supabase: SupabaseClient, { workflowId, name, description, workflowData }: VersionControl.API.Publish.Request): Promise<VersionControl.Publication> {
        const user_id = await getUserId(supabase);
        if (!user_id) throw new Error('Unauthenticated');

        const { data: row } = await supabase
            .rpc('publish_workflow', {
                p_workflow_id:   workflowId,
                p_user_id:       user_id,
                p_name:          name,
                p_description:   description ?? null,
                p_workflow_data: workflowData,
            })
            .single()
            .throwOnError();

        return row as VersionControl.Publication;
    }

    @SupabaseAssert('publication.list')
    @ZodReturn(VersionControl.Publication.Meta.Schema.array())
    async list(supabase: SupabaseClient, { workflowId }: VersionControl.API.List.Request): Promise<VersionControl.Publication.Meta[]> {
        const { data } = await supabase
            .from('version_control')
            .select('id, workflow_id, version, name, description, is_active, published_at')
            .eq('workflow_id', workflowId)
            .order('version', { ascending: false })
            .throwOnError();

        return data ?? [];
    }

    @SupabaseAssert('versionControl.listActiveWorkflows')
    @ZodReturn(z.record(Workflow.Id, VersionControl.Publication.Meta.Schema))
    async listActiveWorkflows(supabase: SupabaseClient): Promise<Record<Workflow.Id, VersionControl.Publication.Meta>> {
        const user_id = await getUserId(supabase);
        if (!user_id) throw new Error('Unauthenticated');

        const { data: rows } = await supabase
            .from('version_control')
            .select('id, workflow_id, version, name, description, is_active, published_at')
            .eq('user_id', user_id)
            .eq('is_active', true)
            .order('published_at', { ascending: false })
            .throwOnError();

        return Object.fromEntries(
            (rows ?? []).map((r) => [r.workflow_id, r]),
        );
    }

    @SupabaseAssert('versionControl.getActiveByWorkflow')
    @ZodReturn(VersionControl.Publication.Meta.Schema.nullable())
    async getActiveByWorkflow(supabase: SupabaseClient, { workflowId }: VersionControl.API.GetActiveByWorkflow.Request): Promise<VersionControl.Publication.Meta | null> {
        const user_id = await getUserId(supabase);
        if (!user_id) throw new Error('Unauthenticated');

        const { data: row } = await supabase
            .from('version_control')
            .select('id, workflow_id, version, name, description, is_active, published_at')
            .eq('user_id', user_id)
            .eq('workflow_id', workflowId)
            .eq('is_active', true)
            .maybeSingle()
            .throwOnError();

        return row ?? null;
    }

    @SupabaseAssert('publication.get')
    @ZodReturn(VersionControl.Publication.Schema)
    async get(supabase: SupabaseClient, { publicationId }: VersionControl.API.Get.Request): Promise<VersionControl.Publication> {
        const { data: row } = await supabase
            .from('version_control')
            .select('*')
            .eq('id', publicationId)
            .single()
            .throwOnError();

        return row
    }

    @SupabaseAssert('publication.activate')
    @ZodReturn(VersionControl.Publication.Schema)
    async activate(supabase: SupabaseClient, { publicationId }: VersionControl.API.Activate.Request): Promise<VersionControl.Publication> {
        const { data: row } = await supabase
            .rpc('activate_publication', { p_publication_id: publicationId })
            .single()
            .throwOnError();

        return row as VersionControl.Publication;
    }

    @SupabaseAssert('publication.deactivate')
    @ZodReturn(VersionControl.Publication.Schema)
    async deactivate(supabase: SupabaseClient, { publicationId }: VersionControl.API.Deactivate.Request): Promise<VersionControl.Publication> {
        const { data: row } = await supabase
            .from('version_control')
            .update({ is_active: false })
            .eq('id', publicationId)
            .select('*')
            .single()
            .throwOnError();

        return row;
    }

    @SupabaseAssert('publication.remove')
    @ZodReturn(z.object({ workflowId: Workflow.Id, wasActive: z.boolean() }))
    async remove(supabase: SupabaseClient, { publicationId }: VersionControl.API.Remove.Request): Promise<{ workflowId: Workflow.Id; wasActive: boolean }> {
        const { data: row } = await supabase
            .from('version_control')
            .select('workflow_id, is_active')
            .eq('id', publicationId)
            .single()
            .throwOnError();

        await supabase.from('version_control').delete().eq('id', publicationId).throwOnError();

        return { workflowId: row.workflow_id, wasActive: row.is_active };
    }
}
