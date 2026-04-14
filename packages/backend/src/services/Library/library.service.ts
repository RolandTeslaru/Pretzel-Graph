import { Injectable } from '@nestjs/common';
import { createAuthenticatedClient } from '@/utils/supabase';
import { Library, Workflow } from '@vx-agent-editor/shared/domain';
import { SupabaseClient } from '@supabase/supabase-js';
import { withSupabaseAssert } from '@vx-agent-editor/shared/errors/supabase';

@Injectable()
export class LibraryService {

    private readonly dbOps = {
        project: {
            create: withSupabaseAssert('project.create', async (
                supabase: SupabaseClient,
                payload: Library.API.Project.Create.Request,
            ) => {
                const { data } = await supabase
                    .from('projects')
                    .insert(payload)
                    .select()
                    .single()
                    .throwOnError();
                return data as Library.Project;
            }),

            list: withSupabaseAssert('project.list', async (supabase: SupabaseClient) => {
                const { data } = await supabase
                    .from('projects')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .throwOnError();
                return (data ?? []) as Library.Project[];
            }),

            delete: withSupabaseAssert('project.delete', async (supabase: SupabaseClient, id: Library.Project.Id) => {
                await supabase.from('projects').delete().eq('id', id).throwOnError();
            }),
        },

        folder: {
            create: withSupabaseAssert('folder.create', async (
                supabase: SupabaseClient,
                payload: {
                    project_id: Library.Project.Id;
                    parent_folder_id: Library.Folder.Id | null;
                    is_root: boolean;
                    display_name: string;
                    description?: string | null;
                },
            ) => {
                const { data } = await supabase
                    .from('folders')
                    .insert(payload)
                    .select()
                    .single()
                    .throwOnError();
                return data as Library.Folder;
            }),

            list: withSupabaseAssert('folder.list', async (supabase: SupabaseClient, projectId?: Library.Project.Id) => {
                let q = supabase.from('folders').select('*');
                if (projectId) q = q.eq('project_id', projectId);
                const { data } = await q.throwOnError();
                return (data ?? []) as Library.Folder[];
            }),

            delete: withSupabaseAssert('folder.delete', async (supabase: SupabaseClient, id: Library.Folder.Id) => {
                await supabase.from('folders').delete().eq('id', id).throwOnError();
            }),
        },

        workflow: {
            create: withSupabaseAssert('workflow.create', async (
                supabase: SupabaseClient,
                payload: Library.API.Workflow.Create.Request,
            ) => {
                const { data } = await supabase
                    .from('workflows')
                    .insert(payload)
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
                let q = supabase
                    .from('workflows')
                    .select('id, user_id, folder_id, display_name, description, locked, mcp_enabled, created_at, updated_at');
                if (folderId) q = q.eq('folder_id', folderId);
                const { data } = await q.throwOnError();
                return data ?? [];
            }),

            delete: withSupabaseAssert('workflow.delete', async (supabase: SupabaseClient, id: Workflow.Id) => {
                await supabase.from('workflows').delete().eq('id', id).throwOnError();
            }),
        },
    };


    // ─────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────

    async createProject(
        token: string,
        payload: Library.API.Project.Create.Request,
    ): Promise<Library.API.Project.Create.Response> {
        const supabase = createAuthenticatedClient(token);
        const project = await this.dbOps.project.create(supabase, payload);

        // Bootstrap project's root folder. Roll back project on failure.
        try {
            await this.dbOps.folder.create(supabase, {
                project_id: project.id,
                parent_folder_id: null,
                is_root: true,
                display_name: project.display_name,
                description: null,
            });
        } catch (err) {
            await this.dbOps.project.delete(supabase, project.id).catch(() => { });
            throw err;
        }

        return project;
    }

    async listProjects(token: string): Promise<Library.API.Project.List.Response> {
        const supabase = createAuthenticatedClient(token);
        return await this.dbOps.project.list(supabase);
    }

    async deleteProject(token: string, id: Library.Project.Id): Promise<Library.API.Project.Delete.Response> {
        const supabase = createAuthenticatedClient(token);
        await this.dbOps.project.delete(supabase, id);
        return { ok: true };
    }


    async createFolder(
        token: string,
        payload: Library.API.Folder.Create.Request,
    ): Promise<Library.API.Folder.Create.Response> {
        const supabase = createAuthenticatedClient(token);
        return await this.dbOps.folder.create(supabase, {
            ...payload,
            is_root: false,
        });
    }

    async listFolders(
        token: string,
        projectId?: Library.Project.Id,
    ): Promise<Library.API.Folder.List.Response> {
        const supabase = createAuthenticatedClient(token);
        return await this.dbOps.folder.list(supabase, projectId);
    }

    async deleteFolder(token: string, id: Library.Folder.Id): Promise<Library.API.Folder.Delete.Response> {
        const supabase = createAuthenticatedClient(token);
        await this.dbOps.folder.delete(supabase, id);
        return { ok: true };
    }


    async createWorkflow(
        token: string,
        payload: Library.API.Workflow.Create.Request,
    ): Promise<Library.API.Workflow.Create.Response> {
        const supabase = createAuthenticatedClient(token);
        return await this.dbOps.workflow.create(supabase, payload);
    }

    async getWorkflow(token: string, workflowId: Workflow.Id): Promise<Library.API.Workflow.Get.Response> {
        const supabase = createAuthenticatedClient(token);
        return await this.dbOps.workflow.get(supabase, workflowId);
    }

    async listWorkflows(
        token: string,
        folderId?: Library.Folder.Id,
    ): Promise<Library.API.Workflow.List.Response> {
        const supabase = createAuthenticatedClient(token);
        return await this.dbOps.workflow.list(supabase, folderId);
    }

    async deleteWorkflow(token: string, id: Workflow.Id): Promise<Library.API.Workflow.Delete.Response> {
        const supabase = createAuthenticatedClient(token);
        await this.dbOps.workflow.delete(supabase, id);
        return { ok: true };
    }
}
