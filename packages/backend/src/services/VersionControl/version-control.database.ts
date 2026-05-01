import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { getUserId } from '@/utils/supabase';
import { withSupabaseAssert } from '@pretzel-graph/shared/errors/supabase';
import { VersionControl, Workflow } from '@pretzel-graph/shared/domain';

@Injectable()
export class VersionControlDatabase {
    public readonly publish = withSupabaseAssert('publication.publish', async (
        supabase: SupabaseClient,
        { workflowId, name, description, workflowData }: VersionControl.API.Publish.Request,
    ): Promise<VersionControl.Publication> => {
        const user_id = await getUserId(supabase);
        if (!user_id) throw new Error('Unauthenticated');

        const { data: row } = await supabase
            .rpc('publish_workflow', {
                p_workflow_id: workflowId,
                p_user_id: user_id,
                p_name: name,
                p_description: description ?? null,
                p_workflow_data: workflowData,
            })
            .single()
            .throwOnError();

        return VersionControl.Publication.Schema.parse(row);
    });

    public readonly list = withSupabaseAssert('publication.list', async (
        supabase: SupabaseClient,
        { workflowId }: VersionControl.API.List.Request,
    ): Promise<VersionControl.PublicationMeta[]> => {
        const { data: rows } = await supabase
            .from('version_control')
            .select('id, workflow_id, version, name, description, is_active, published_at')
            .eq('workflow_id', workflowId)
            .order('version', { ascending: false })
            .throwOnError();

        return (rows ?? []).map((r) => VersionControl.PublicationMeta.Schema.parse(r));
    });

    public readonly get = withSupabaseAssert('publication.get', async (
        supabase: SupabaseClient,
        { publicationId }: VersionControl.API.Get.Request,
    ): Promise<VersionControl.Publication> => {
        const { data: row } = await supabase
            .from('version_control')
            .select('*')
            .eq('id', publicationId)
            .single()
            .throwOnError();

        return VersionControl.Publication.Schema.parse(row);
    });

    public readonly activate = withSupabaseAssert('publication.activate', async (
        supabase: SupabaseClient,
        { publicationId }: VersionControl.API.Activate.Request,
    ): Promise<VersionControl.Publication> => {
        const { data: row } = await supabase
            .rpc('activate_publication', { p_publication_id: publicationId })
            .single()
            .throwOnError();

        return VersionControl.Publication.Schema.parse(row);
    });

    public readonly deactivate = withSupabaseAssert('publication.deactivate', async (
        supabase: SupabaseClient,
        { publicationId }: VersionControl.API.Deactivate.Request,
    ): Promise<VersionControl.Publication> => {
        const { data: row } = await supabase
            .from('version_control')
            .update({ is_active: false })
            .eq('id', publicationId)
            .select('*')
            .single()
            .throwOnError();

        return VersionControl.Publication.Schema.parse(row);
    });

    public readonly remove = withSupabaseAssert('publication.remove', async (
        supabase: SupabaseClient,
        { publicationId }: VersionControl.API.Remove.Request,
    ): Promise<{ workflowId: Workflow.Id; wasActive: boolean }> => {
        const { data: row } = await supabase
            .from('version_control')
            .select('workflow_id, is_active')
            .eq('id', publicationId)
            .single()
            .throwOnError();

        await supabase
            .from('version_control')
            .delete()
            .eq('id', publicationId)
            .throwOnError();

        return { workflowId: row.workflow_id as Workflow.Id, wasActive: row.is_active };
    });
}
