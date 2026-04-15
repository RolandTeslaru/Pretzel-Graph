import { Injectable } from '@nestjs/common';
import { createAuthenticatedClient, getUserId } from '@/utils/supabase';
import { Library, Workflow } from '@vx-agent-editor/shared/domain';
import { SupabaseClient } from '@supabase/supabase-js';
import { withSupabaseAssert } from '@vx-agent-editor/shared/errors/supabase';

@Injectable()
export class LibraryService {

    private readonly dbOps = {
        bootstrap: {
            get: withSupabaseAssert('bootstrap.get', async (
                supabase: SupabaseClient,
            ) => {
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
                        .select('id, folder_id, display_name, description, locked, mcp_enabled, created_at, updated_at')
                        .order('created_at', { ascending: false })
                        .throwOnError(),
                ]);

                return {
                    projects: (projectsRes.data ?? []).map((row) => Library.Folder.Schema.parse(row)),
                    folders: (foldersRes.data ?? []).map((row) => Library.Folder.Schema.parse(row)),
                    workflow_metas: (workflowMetasRes.data ?? []).map((row) => Library.WorkflowMeta.Schema.parse(row)),
                };
            }),
        },

        project: {
            create: withSupabaseAssert('project.create', async (
                supabase: SupabaseClient,
                payload: Library.API.Project.Create.Request,
            ) => {
                const user_id = await getUserId(supabase);
                if (!user_id) throw new Error('Unauthenticated');

                const { data: row } = await supabase
                    .from('folders')
                    .insert({
                        ...payload,
                        is_root: true,
                        user_id
                    })
                    .select()
                    .single<Library.Database.FolderRow>()
                    .throwOnError();

                return Library.Folder.Schema.parse(row);
            }),

            list: withSupabaseAssert('project.list', async (
                supabase: SupabaseClient,
            ) => {
                const { data: rows } = await supabase
                    .from('folders')
                    .select('*')
                    .eq('is_root', true)
                    .is('parent_folder_id', null)
                    .order('created_at', { ascending: false })
                    .throwOnError();

                return (rows ?? []).map((row) => Library.Folder.Schema.parse(row));
            })
        },

        folder: {
            create: withSupabaseAssert('folder.create', async (
                supabase: SupabaseClient,
                payload: {
                    parent_folder_id: Library.Folder.Id,
                    display_name: string;
                    description?: string | null;
                },
            ) => {
                const user_id = await getUserId(supabase);
                if (!user_id) throw new Error('Unauthenticated');

                const { data: row } = await supabase
                    .from('folders')
                    .insert({ ...payload, user_id })
                    .select()
                    .single<Library.Database.FolderRow>()
                    .throwOnError();

                return Library.Folder.Schema.parse(row);
            }),

            delete: withSupabaseAssert('folder.delete', async (supabase: SupabaseClient, id: Library.Folder.Id) => {
                await supabase.from('folders').delete().eq('id', id).throwOnError();
            }),

            getContents: withSupabaseAssert('folder.getContents', async (supabase: SupabaseClient, id: Library.Folder.Id) => {
                const [folderRes, childFoldersRes, workflowMetasRes] = await Promise.all([
                    supabase.from('folders').select('*').eq('id', id).single().throwOnError(),       // folder itself
                    supabase.from('folders').select('*').eq('parent_folder_id', id).throwOnError(), // child folders
                    supabase
                        .from('workflows')
                        .select('id, folder_id, display_name, description, locked, mcp_enabled, created_at, updated_at')
                        .eq('folder_id', id)
                        .throwOnError(),
                ]);

                return {
                    folder: folderRes.data as Library.Folder,
                    child_folders: (childFoldersRes.data ?? []) as Library.Folder[],
                    workflows: (workflowMetasRes.data ?? []) as Library.WorkflowMeta[],
                };
            }),
        },

        workflow: {
            create: withSupabaseAssert('workflow.create', async (
                supabase: SupabaseClient,
                payload: Library.API.Workflow.Create.Request,
            ) => {
                const user_id = await getUserId(supabase);
                if (!user_id) throw new Error('Unauthenticated');
                
                const { data: row } = await supabase
                    .from('workflows')
                    .insert({
                        ...payload,
                        user_id,
                        locked: false,
                        data: Workflow.INITIAL.data,
                    })
                    .select()
                    .single<Workflow.Database.Row>()
                    .throwOnError();

                const wf = Workflow.Schema.parse(row);
                return wf;
            }),

            get: withSupabaseAssert('workflow.get', async (supabase: SupabaseClient, workflowId: Workflow.Id) => {
                const { data: row } = await supabase
                    .from('workflows')
                    .select('*')
                    .eq('id', workflowId)
                    .single<Workflow.Database.Row>()
                    .throwOnError();

                const wf = Workflow.Schema.parse(row);
                return wf;
            }),

            delete: withSupabaseAssert('workflow.delete', async (supabase: SupabaseClient, id: Workflow.Id) => {
                await supabase.from('workflows').delete().eq('id', id).throwOnError();
            }),
        },
    };


    // ─────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────

    public readonly bootstrap = {
        get: async (
            token: string,
        ): Promise<Library.API.Bootstrap.Get.Response> => {
            const supabase = createAuthenticatedClient(token);
            return await this.dbOps.bootstrap.get(supabase);
        },
    };

    public readonly project = {
        create: async (
            token: string,
            payload: Library.API.Project.Create.Request,
        ): Promise<Library.API.Project.Create.Response> => {
            const supabase = createAuthenticatedClient(token);
            return await this.dbOps.project.create(supabase, payload);
        },

        list: async (
            token: string,
        ): Promise<Library.API.Project.List.Response> => {
            const supabase = createAuthenticatedClient(token);
            return await this.dbOps.project.list(supabase);
        }
    };

    public readonly folder = {
        create: async (
            token: string,
            payload: Library.API.Folder.Create.Request,
        ): Promise<Library.API.Folder.Create.Response> => {
            const supabase = createAuthenticatedClient(token);
            return await this.dbOps.folder.create(supabase, payload);
        },

        delete: async (
            token: string,
            id: Library.Folder.Id,
        ): Promise<Library.API.Folder.Remove.Response> => {
            const supabase = createAuthenticatedClient(token);
            await this.dbOps.folder.delete(supabase, id);
            return { ok: true };
        },

        getContents: async (
            token: string,
            id: Library.Folder.Id,
        ): Promise<Library.API.Folder.GetContents.Response> => {
            const supabase = createAuthenticatedClient(token);
            return await this.dbOps.folder.getContents(supabase, id);
        }
    };

    public readonly workflow = {
        create: async (
            token: string,
            payload: Library.API.Workflow.Create.Request,
        ): Promise<Library.API.Workflow.Create.Response> => {
            const supabase = createAuthenticatedClient(token);
            return await this.dbOps.workflow.create(supabase, payload);
        },

        get: async (
            token: string,
            workflowId: Workflow.Id,
        ): Promise<Library.API.Workflow.Get.Response> => {
            const supabase = createAuthenticatedClient(token);
            return await this.dbOps.workflow.get(supabase, workflowId);
        },

        delete: async (
            token: string,
            id: Workflow.Id,
        ): Promise<Library.API.Workflow.Remove.Response> => {
            const supabase = createAuthenticatedClient(token);
            await this.dbOps.workflow.delete(supabase, id);
            return { ok: true };
        }
    };
}
