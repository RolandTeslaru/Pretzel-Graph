import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { createAuthenticatedClient, getUserId } from '@/utils/supabase';
import { withSupabaseAssert } from '@vx-agent-editor/shared/errors/supabase';
import { VersionControl, Workflow } from '@vx-agent-editor/shared/domain';
import { RealtimeService } from '../Realtime/realtime.service';

@Injectable()
export class VersionControlService {
    constructor(
        private readonly realtime: RealtimeService,
    ) {}

    // ─────────────────────────────────────────────────────────
    // DB ops
    // ─────────────────────────────────────────────────────────

    private readonly dbOps = {
        publish: withSupabaseAssert('publication.publish', async (
            supabase: SupabaseClient,
            { workflowId, workflowData }: VersionControl.API.Publish.Request,
        ): Promise<VersionControl.Publication> => {
            const user_id = await getUserId(supabase);
            if (!user_id) throw new Error('Unauthenticated');

            const { data: row } = await supabase
                .rpc('publish_workflow', {
                    p_workflow_id: workflowId,
                    p_user_id: user_id,
                    p_workflow_data: workflowData,
                })
                .single()
                .throwOnError();

            return VersionControl.Publication.Schema.parse(row);
        }),

        list: withSupabaseAssert('publication.list', async (
            supabase: SupabaseClient,
            { workflowId }: VersionControl.API.List.Request,
        ): Promise<VersionControl.Publication[]> => {
            const { data: rows } = await supabase
                .from('version_control')
                .select('*')
                .eq('workflow_id', workflowId)
                .order('version', { ascending: false })
                .throwOnError();

            return (rows ?? []).map((r) => VersionControl.Publication.Schema.parse(r));
        }),

        get: withSupabaseAssert('publication.get', async (
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
        }),

        activate: withSupabaseAssert('publication.activate', async (
            supabase: SupabaseClient,
            { publicationId }: VersionControl.API.Activate.Request,
        ): Promise<VersionControl.Publication> => {
            const { data: row } = await supabase
                .rpc('activate_publication', { p_publication_id: publicationId })
                .single()
                .throwOnError();

            return VersionControl.Publication.Schema.parse(row);
        }),

        deactivate: withSupabaseAssert('publication.deactivate', async (
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
        }),

        remove: withSupabaseAssert('publication.remove', async (
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
        }),
    };

    // ─────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────

    async publish(
        token: string,
        payload: VersionControl.API.Publish.Request,
    ): Promise<VersionControl.API.Publish.Response> {
        const supabase = createAuthenticatedClient(token);
        const publication = await this.dbOps.publish(supabase, payload);
        this.realtime.emitSignal<VersionControl.Signal.Published>({
            channel: VersionControl.Signal.getChannel(publication.workflow_id, "published"),
            type: "published",
            workflowId: publication.workflow_id,
            publicationId: publication.id,
            publication,
        });
        return { publication };
    }

    async list(
        token: string,
        payload: VersionControl.API.List.Request,
    ): Promise<VersionControl.API.List.Response> {
        const supabase = createAuthenticatedClient(token);
        const publications = await this.dbOps.list(supabase, payload);
        return { publications };
    }

    async get(
        token: string,
        payload: VersionControl.API.Get.Request,
    ): Promise<VersionControl.API.Get.Response> {
        const supabase = createAuthenticatedClient(token);
        const publication = await this.dbOps.get(supabase, payload);
        return { publication };
    }

    async activate(
        token: string,
        payload: VersionControl.API.Activate.Request,
    ): Promise<VersionControl.API.Activate.Response> {
        const supabase = createAuthenticatedClient(token);
        const publication = await this.dbOps.activate(supabase, payload);
        this.realtime.emitSignal<VersionControl.Signal.Activated>({
            channel: VersionControl.Signal.getChannel(publication.workflow_id, "activated"),
            type: "activated",
            workflowId: publication.workflow_id,
            publicationId: publication.id,
            publication,
        });
        return { publication };
    }

    async deactivate(
        token: string,
        payload: VersionControl.API.Deactivate.Request,
    ): Promise<VersionControl.API.Deactivate.Response> {
        const supabase = createAuthenticatedClient(token);
        const publication = await this.dbOps.deactivate(supabase, payload);
        this.realtime.emitSignal<VersionControl.Signal.Deactivated>({
            channel: VersionControl.Signal.getChannel(publication.workflow_id, "deactivated"),
            type: "deactivated",
            workflowId: publication.workflow_id,
            publicationId: publication.id,
        });
        return { publication };
    }

    async remove(
        token: string,
        payload: VersionControl.API.Remove.Request,
    ): Promise<VersionControl.API.Remove.Response> {
        const supabase = createAuthenticatedClient(token);
        const { workflowId } = await this.dbOps.remove(supabase, payload);
        this.realtime.emitSignal<VersionControl.Signal.Removed>({
            channel: VersionControl.Signal.getChannel(workflowId, "removed"),
            type: "removed",
            workflowId,
            publicationId: payload.publicationId,
        });
        return { success: true };
    }
}
