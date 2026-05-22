import { Injectable } from '@nestjs/common';
import { getUserId } from '@/utils/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { SystemError, VersionControl, Workflow, Workbench } from '@pretzel-graph/shared/domain';
import { SupabaseAssert, ZodReturn } from '../../decorators/database';
import { z } from 'zod';

class WorkflowMethods {

    @SupabaseAssert('workbench.workflow.create')
    @ZodReturn(Workflow.Id)
    async create(supabase: SupabaseClient, payload: Workbench.API.Workflow.Create.Request): Promise<Workflow.Id> {
        const workflow = payload.workflow;
        const user_id = await getUserId(supabase);
        if (!user_id) throw new Error('Unauthenticated');

        const { data: row } = await supabase
            .from('workflows')
            .insert({
                folder_id:    workflow.folder_id,
                display_name: workflow.display_name,
                description:  workflow.description,
                locked:       workflow.locked,
                mcp_enabled:  false,
                data:         workflow.data,
                user_id,
            })
            .select('id')
            .single<{ id: Workflow.Id }>()
            .throwOnError();

        return row!.id;
    }

    @SupabaseAssert('workbench.workflow.get')
    @ZodReturn(Workflow.Schema)
    async get(supabase: SupabaseClient, workflowId: Workflow.Id): Promise<Workflow> {
        const { data: row } = await supabase
            .from('workflows')
            .select('*')
            .eq('id', workflowId)
            .single<Workflow.Database.Row>()
            .throwOnError();

        return row;
    }

    @SupabaseAssert('workbench.workflow.commit')
    async commit(supabase: SupabaseClient, payload: Workbench.API.Workflow.Commit.Request): Promise<void> {
        await supabase
            .from('workflows')
            .update({ data: payload.data, updated_at: new Date().toISOString() })
            .eq('id', payload.workflowId)
            .throwOnError();
    }
}

class PublishedDependencyMethods {

    @SupabaseAssert('workbench.dependency.published.load')
    @ZodReturn(Workflow.Dependency.Publication.Schema)
    async load(supabase: SupabaseClient, workflowId: Workflow.Id): Promise<Workflow.Dependency.Publication> {
        const requesterId = await getUserId(supabase);
        if (!requesterId) throw new Error('Unauthenticated');

        const { data: workflow } = await supabase
            .from('workflows')
            .select('id, display_name, icon, accent')
            .eq('id', workflowId)
            .or(`user_id.eq.${requesterId},is_public.eq.true`)
            .maybeSingle<Pick<Workflow.Database.Row, 'id' | 'display_name' | 'icon' | 'accent'>>()
            .throwOnError();

        if (!workflow)
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

        return {
            ...publication,
            publication_name: publication.name,
            display_name:     workflow.display_name,
            icon:             workflow.icon,
            accent:           workflow.accent,
        };
    }

    @SupabaseAssert('workbench.dependency.published.checkUpdates')
    @ZodReturn(z.record(Workflow.Id, Workflow.Dependency.Publication.UpdateInfo))
    async checkUpdates(
        supabase:     SupabaseClient,
        dependencies: Workbench.API.Dependency.Published.CheckUpdates.Request['dependencies'],
    ): Promise<Record<Workflow.Id, Workflow.Dependency.Publication.UpdateInfo>> {
        if (dependencies.length === 0) return {};

        const workflowIds = dependencies.map(d => d.workflowId);
        const currentPublicationById = new Map(dependencies.map(d => [d.workflowId, d.publicationId]));

        const { data: rows } = await supabase
            .from('version_control')
            .select('id, workflow_id, version, name, description')
            .in('workflow_id', workflowIds)
            .eq('is_active', true)
            .throwOnError();

        const updates: Record<Workflow.Id, Workflow.Dependency.Publication.UpdateInfo> = {};
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
    }
}

class DraftDependencyMethods {

    @SupabaseAssert('workbench.dependency.draft.load')
    @ZodReturn(Workflow.Dependency.Draft.Schema)
    async load(supabase: SupabaseClient, workflowId: Workflow.Id): Promise<Workflow.Dependency.Draft> {
        const requesterId = await getUserId(supabase);
        if (!requesterId) throw new Error('Unauthenticated');

        const { data: row } = await supabase
            .from('workflows')
            .select('id, display_name, icon, accent, data, updated_at')
            .eq('id', workflowId)
            .or(`user_id.eq.${requesterId},is_public.eq.true`)
            .maybeSingle<Pick<Workflow.Database.Row, 'id' | 'display_name' | 'icon' | 'accent' | 'data' | 'updated_at'>>()
            .throwOnError();

        if (!row)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Workflow not found or not accessible');

        return {
            workflow_id:         row.id,
            workflow_data:       Workflow.Data.Schema.parse(row.data),
            display_name:        row.display_name,
            icon:                row.icon,
            accent:              row.accent,
            workflow_updated_at: row.updated_at,
        };
    }

    @SupabaseAssert('workbench.dependency.draft.checkUpdates')
    @ZodReturn(z.record(Workflow.Id, Workflow.Dependency.Draft.UpdateInfo))
    async checkUpdates(
        supabase:     SupabaseClient,
        dependencies: Workbench.API.Dependency.Draft.CheckUpdates.Request['dependencies'],
    ): Promise<Record<Workflow.Id, Workflow.Dependency.Draft.UpdateInfo>> {
        if (dependencies.length === 0) return {};

        const workflowIds = dependencies.map(d => d.workflowId);
        const currentUpdatedAt = new Map(dependencies.map(d => [d.workflowId, d.workflow_updated_at]));

        const { data: rows } = await supabase
            .from('workflows')
            .select('id, updated_at')
            .in('id', workflowIds)
            .throwOnError();

        const updates: Record<Workflow.Id, Workflow.Dependency.Draft.UpdateInfo> = {};
        for (const row of rows ?? []) {
            const stored = currentUpdatedAt.get(row.id as Workflow.Id);
            const rowDate = new Date(row.updated_at);
            if (stored && rowDate.getTime() !== stored.getTime())
                updates[row.id as Workflow.Id] = {
                    workflowId:          row.id as Workflow.Id,
                    workflow_updated_at: rowDate,
                };
        }

        return updates;
    }
}

class DependencyMethods {
    public readonly published = new PublishedDependencyMethods();
    public readonly draft     = new DraftDependencyMethods();
}

@Injectable()
export class WorkbenchDatabase {
    public readonly workflow   = new WorkflowMethods();
    public readonly dependency = new DependencyMethods();
}
