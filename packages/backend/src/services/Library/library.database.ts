import { Injectable } from '@nestjs/common';
import { DB } from '@/db';
import { getUserId } from '@/utils/supabase';
import { Library, Workflow } from '@pretzel-graph/shared/domain';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAssert, ZodReturn } from '../../decorators/database';
import { z } from 'zod';

class BootstrapMethods {

    @SupabaseAssert('bootstrap.get')
    @ZodReturn(z.object({
        projects:       Library.Folder.Schema.array(),
        folders:        Library.Folder.Schema.array(),
        workflow_metas: Library.WorkflowMeta.Schema.array(),
    }))
    async get(supabase: SupabaseClient): Promise<Library.API.Bootstrap.Get.Response> {
        const [projectsRes, foldersRes, workflowMetasRes] = await Promise.all([
            supabase
                .from('folders')
                .select('*')
                .eq('is_root', true)
                .is('parent_folder_id', null)
                .order('created_at', { ascending: false })
                .throwOnError(),
            supabase
                .from('folders')
                .select('*')
                .order('created_at', { ascending: false })
                .throwOnError(),
            supabase
                .from('workflows')
                .select('id, folder_id, display_name, description, icon, accent, icon_color, locked, is_public, mcp_enabled, created_at, updated_at')
                .order('created_at', { ascending: false })
                .throwOnError(),
        ]);

        return {
            projects:       projectsRes.data      ?? [],
            folders:        foldersRes.data        ?? [],
            workflow_metas: workflowMetasRes.data  ?? [],
        };
    }
}

class ProjectMethods {

    @SupabaseAssert('project.create')
    @ZodReturn(Library.Folder.Schema)
    async create(supabase: SupabaseClient, payload: Library.API.Project.Create.Request): Promise<Library.Folder> {
        const user_id = await getUserId(supabase);
        if (!user_id) throw new Error('Unauthenticated');

        const { data: row } = await supabase
            .from('folders')
            .insert({ ...payload, is_root: true, user_id })
            .select()
            .single<DB.Folder.Row>()
            .throwOnError();

        return row;
    }

    @SupabaseAssert('project.update')
    @ZodReturn(Library.Folder.Schema)
    async update(supabase: SupabaseClient, payload: Library.API.Project.Update.Request): Promise<Library.Folder> {
        const { data: row } = await supabase
            .from('folders')
            .update({
                display_name: payload.display_name,
                description:  payload.description ?? null,
            })
            .eq('id', payload.id)
            .eq('is_root', true)
            .select('*')
            .single<DB.Folder.Row>()
            .throwOnError();

        return row;
    }

    @SupabaseAssert('project.list')
    @ZodReturn(Library.Folder.Schema.array())
    async list(supabase: SupabaseClient): Promise<Library.Folder[]> {
        const { data: rows } = await supabase
            .from('folders')
            .select('*')
            .eq('is_root', true)
            .is('parent_folder_id', null)
            .order('created_at', { ascending: false })
            .throwOnError();

        return rows ?? [];
    }
}

class FolderMethods {

    @SupabaseAssert('folder.create')
    @ZodReturn(Library.Folder.Schema)
    async create(supabase: SupabaseClient, payload: {
        parent_folder_id: Library.Folder.Id;
        display_name:     string;
        description?:     string | null;
    }): Promise<Library.Folder> {
        const user_id = await getUserId(supabase);
        if (!user_id) throw new Error('Unauthenticated');

        const { data: row } = await supabase
            .from('folders')
            .insert({ ...payload, user_id })
            .select()
            .single<DB.Folder.Row>()
            .throwOnError();

        return row;
    }

    @SupabaseAssert('folder.update')
    @ZodReturn(Library.Folder.Schema)
    async update(supabase: SupabaseClient, payload: Library.API.Folder.Update.Request): Promise<Library.Folder> {
        const { data: row } = await supabase
            .from('folders')
            .update({
                display_name: payload.display_name,
                description:  payload.description ?? null,
            })
            .eq('id', payload.id)
            .select('*')
            .single<DB.Folder.Row>()
            .throwOnError();

        return row;
    }

    @SupabaseAssert('folder.delete')
    async delete(supabase: SupabaseClient, id: Library.Folder.Id): Promise<void> {
        await supabase.from('folders').delete().eq('id', id).throwOnError();
    }

    @SupabaseAssert('folder.getContents')
    @ZodReturn(z.object({
        folder:        Library.Folder.Schema,
        child_folders: Library.Folder.Schema.array(),
        workflows:     Library.WorkflowMeta.Schema.array(),
    }))
    async getContents(supabase: SupabaseClient, id: Library.Folder.Id): Promise<Library.API.Folder.GetContents.Response> {
        const [folderRes, childFoldersRes, workflowMetasRes] = await Promise.all([
            supabase.from('folders').select('*').eq('id', id).single().throwOnError(),
            supabase.from('folders').select('*').eq('parent_folder_id', id).throwOnError(),
            supabase
                .from('workflows')
                .select('id, folder_id, display_name, description, icon, accent, icon_color, locked, is_public, mcp_enabled, created_at, updated_at')
                .eq('folder_id', id)
                .throwOnError(),
        ]);

        return {
            folder:        folderRes.data,
            child_folders: childFoldersRes.data  ?? [],
            workflows:     workflowMetasRes.data  ?? [],
        };
    }
}

class WorkflowMethods {

    @SupabaseAssert('workflow.create')
    @ZodReturn(Workflow.Schema)
    async create(supabase: SupabaseClient, payload: Library.API.Workflow.Create.Request): Promise<Workflow> {
        const user_id = await getUserId(supabase);
        if (!user_id) throw new Error('Unauthenticated');

        const { data: row } = await supabase
            .from('workflows')
            .insert({
                ...payload,
                user_id,
                locked: false,
                data:   Workflow.INITIAL.data,
            })
            .select()
            .single<DB.Workflow.Row>()
            .throwOnError();

        return DB.Workflow.toDomain(row);
    }

    @SupabaseAssert('workflow.update')
    @ZodReturn(Library.WorkflowMeta.Schema)
    async update(supabase: SupabaseClient, payload: Library.API.Workflow.Update.Request): Promise<Library.WorkflowMeta> {
        const { data: row } = await supabase
            .from('workflows')
            .update({
                ...(payload.display_name !== undefined && { display_name: payload.display_name }),
                ...(payload.description  !== undefined && { description:  payload.description ?? null }),
                ...(payload.icon         !== undefined && { icon:         payload.icon }),
                ...(payload.accent       !== undefined && { accent:       payload.accent }),
                ...(payload.icon_color   !== undefined && { icon_color:   payload.icon_color }),
                ...(payload.is_public    !== undefined && { is_public:    payload.is_public }),
                ...(payload.locked       !== undefined && { locked:       payload.locked }),
            })
            .eq('id', payload.id)
            .select('id, folder_id, display_name, description, icon, accent, icon_color, locked, is_public, mcp_enabled, created_at, updated_at')
            .single()
            .throwOnError();

        return row;
    }

    @SupabaseAssert('workflow.get')
    @ZodReturn(Workflow.Schema)
    async get(supabase: SupabaseClient, workflowId: Workflow.Id): Promise<Workflow> {
        const { data: row } = await supabase
            .from('workflows')
            .select('*')
            .eq('id', workflowId)
            .single<DB.Workflow.Row>()
            .throwOnError();

        return DB.Workflow.toDomain(row);
    }

    @SupabaseAssert('workflow.delete')
    async delete(supabase: SupabaseClient, id: Workflow.Id): Promise<void> {
        await supabase.from('workflows').delete().eq('id', id).throwOnError();
    }

    @SupabaseAssert('workflow.duplicate')
    @ZodReturn(Workflow.Schema)
    async duplicate(supabase: SupabaseClient, id: Workflow.Id): Promise<Workflow> {
        const user_id = await getUserId(supabase);
        if (!user_id) throw new Error('Unauthenticated');

        const { data: source } = await supabase
            .from('workflows')
            .select('*')
            .eq('id', id)
            .single<DB.Workflow.Row>()
            .throwOnError();

        const { data: row } = await supabase
            .from('workflows')
            .insert({
                folder_id:    source.folder_id,
                display_name: `Copy of ${source.display_name}`,
                description:  source.description,
                icon:         source.icon,
                accent:       source.accent,
                icon_color:   source.icon_color,
                data:         source.data,
                user_id,
                locked:       false,
                is_public:    false,
            })
            .select()
            .single<DB.Workflow.Row>()
            .throwOnError();

        return DB.Workflow.toDomain(row);
    }
}

@Injectable()
export class LibraryDatabase {
    public readonly bootstrap = new BootstrapMethods();
    public readonly project   = new ProjectMethods();
    public readonly folder    = new FolderMethods();
    public readonly workflow  = new WorkflowMethods();
}
