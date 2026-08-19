import { Injectable } from '@nestjs/common';
import { Principal } from '@/domain/Principal';
import { DB } from '@/db';
import { Library, Workflow } from '@pretzel-graph/shared/domain';
import { LibraryDatabase } from './library.database';

@Injectable()
export class LibraryService {
    constructor(
        private readonly database:   LibraryDatabase,
    ) {}

    public readonly bootstrap = {
        get: async (
            principal: Principal.User,
        ): Promise<Library.API.Bootstrap.Get.Response> => {
            return DB.asUser(principal, (trx) => this.database.bootstrap.get(trx));
        },
    };

    public readonly folder = {
        create: async (
            principal: Principal.User,
            payload: Library.API.Folder.Create.Request,
        ): Promise<Library.API.Folder.Create.Response> => {
            return DB.asUser(principal, (trx) => this.database.folder.create(trx, principal.userId, payload));
        },

        update: async (
            principal: Principal.User,
            payload: Library.API.Folder.Update.Request,
        ): Promise<Library.API.Folder.Update.Response> => {
            return DB.asUser(principal, (trx) => this.database.folder.update(trx, payload));
        },

        delete: async (
            principal: Principal.User,
            id: Library.Folder.Id,
        ): Promise<Library.API.Folder.Remove.Response> => {
            await DB.asUser(principal, (trx) => this.database.folder.delete(trx, id));
            return { ok: true };
        },

        getContents: async (
            principal: Principal.User,
            id: Library.Folder.Id,
        ): Promise<Library.API.Folder.GetContents.Response> => {
            return DB.asUser(principal, (trx) => this.database.folder.getContents(trx, id));
        }
    };

    public readonly workflow = {
        create: async (
            principal: Principal.User,
            payload: Library.API.Workflow.Create.Request,
        ): Promise<Library.API.Workflow.Create.Response> => {
            return DB.asUser(principal, (trx) => this.database.workflow.create(trx, principal.userId, payload));
        },

        get: async (
            principal: Principal.User,
            workflowId: Workflow.Id,
        ): Promise<Library.API.Workflow.Get.Response> => {
            return DB.asUser(principal, (trx) => this.database.workflow.get(trx, workflowId));
        },

        update: async (
            principal: Principal.User,
            payload: Library.API.Workflow.Update.Request,
        ): Promise<Library.API.Workflow.Update.Response> => {
            return DB.asUser(principal, (trx) => this.database.workflow.update(trx, payload));
        },

        delete: async (
            principal: Principal.User,
            id: Workflow.Id,
        ): Promise<Library.API.Workflow.Remove.Response> => {
            await DB.asUser(principal, (trx) => this.database.workflow.delete(trx, id));

            // After the commit — the cached owner is still correct until the TTL, and would
            // keep authorizing routes against a row that no longer exists.

            return { ok: true };
        },

        duplicate: async (
            principal: Principal.User,
            id: Workflow.Id,
        ): Promise<Library.API.Workflow.Duplicate.Response> => {
            return DB.asUser(principal, (trx) => this.database.workflow.duplicate(trx, principal.userId, id));
        },
    };
}
