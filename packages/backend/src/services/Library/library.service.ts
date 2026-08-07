import { Injectable } from '@nestjs/common';
import { Principal } from '@/domain/Principal';
import { Library, Workflow } from '@pretzel-graph/shared/domain';
import { LibraryDatabase } from './library.database';

@Injectable()
export class LibraryService {
    constructor(private readonly database: LibraryDatabase) {}

    public readonly bootstrap = {
        get: async (
            principal: Principal.User,
        ): Promise<Library.API.Bootstrap.Get.Response> => {
            return await this.database.bootstrap.get(principal.supabase);
        },
    };

    public readonly project = {
        create: async (
            principal: Principal.User,
            payload: Library.API.Project.Create.Request,
        ): Promise<Library.API.Project.Create.Response> => {
            return await this.database.project.create(principal.supabase, payload);
        },

        update: async (
            principal: Principal.User,
            payload: Library.API.Project.Update.Request,
        ): Promise<Library.API.Project.Update.Response> => {
            return await this.database.project.update(principal.supabase, payload);
        },

        list: async (
            principal: Principal.User,
        ): Promise<Library.API.Project.List.Response> => {
            return await this.database.project.list(principal.supabase);
        }
    };

    public readonly folder = {
        create: async (
            principal: Principal.User,
            payload: Library.API.Folder.Create.Request,
        ): Promise<Library.API.Folder.Create.Response> => {
            return await this.database.folder.create(principal.supabase, payload);
        },

        update: async (
            principal: Principal.User,
            payload: Library.API.Folder.Update.Request,
        ): Promise<Library.API.Folder.Update.Response> => {
            return await this.database.folder.update(principal.supabase, payload);
        },

        delete: async (
            principal: Principal.User,
            id: Library.Folder.Id,
        ): Promise<Library.API.Folder.Remove.Response> => {
            await this.database.folder.delete(principal.supabase, id);
            return { ok: true };
        },

        getContents: async (
            principal: Principal.User,
            id: Library.Folder.Id,
        ): Promise<Library.API.Folder.GetContents.Response> => {
            return await this.database.folder.getContents(principal.supabase, id);
        }
    };

    public readonly workflow = {
        create: async (
            principal: Principal.User,
            payload: Library.API.Workflow.Create.Request,
        ): Promise<Library.API.Workflow.Create.Response> => {
            return await this.database.workflow.create(principal.supabase, payload);
        },

        get: async (
            principal: Principal.User,
            workflowId: Workflow.Id,
        ): Promise<Library.API.Workflow.Get.Response> => {
            return await this.database.workflow.get(principal.supabase, workflowId);
        },

        update: async (
            principal: Principal.User,
            payload: Library.API.Workflow.Update.Request,
        ): Promise<Library.API.Workflow.Update.Response> => {
            return await this.database.workflow.update(principal.supabase, payload);
        },

        delete: async (
            principal: Principal.User,
            id: Workflow.Id,
        ): Promise<Library.API.Workflow.Remove.Response> => {
            await this.database.workflow.delete(principal.supabase, id);
            return { ok: true };
        },

        duplicate: async (
            principal: Principal.User,
            id: Workflow.Id,
        ): Promise<Library.API.Workflow.Duplicate.Response> => {
            return await this.database.workflow.duplicate(principal.supabase, id);
        },
    };
}
