import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Auth, Library, Workflow } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { ZodReturn } from '../../decorators/database';
import { AllowedDatabaseRoles, DatabaseClass } from '../../decorators/database-roles';

const WORKFLOW_META_COLUMNS = [
    'id',
    'folder_id',
    'display_name',
    'description',
    'icon',
    'accent',
    'icon_color',
    'locked',
    'mcp_enabled',
    'created_at',
    'updated_at',
] as const;

const toWorkflowMeta = (row: unknown) => Library.WorkflowMeta.Schema.parse(row);

@DatabaseClass
class BootstrapMethods {

    @ZodReturn(z.object({
        folders: Library.Folder.Schema.array(),
        workflow_metas: Library.WorkflowMeta.Schema.array(),
    }))
    @AllowedDatabaseRoles("user")
    async get(trx: DB.UserTransaction): Promise<Library.API.Bootstrap.Get.Response> {
        const [folders, workflowMetas] = await Promise.all([
            trx
                .selectFrom('folders')
                .selectAll()
                .orderBy('created_at', 'desc')
                .execute(),
            trx
                .selectFrom('workflows')
                .select(WORKFLOW_META_COLUMNS)
                .orderBy('created_at', 'desc')
                .execute(),
        ]);

        return {
            folders: folders.map(DB.Folder.toDomain),
            workflow_metas: workflowMetas.map(toWorkflowMeta),
        };
    }
}

@DatabaseClass
class FolderMethods {

    @AllowedDatabaseRoles("user")
    @ZodReturn(Library.Folder.Schema)
    async create(
        trx: DB.UserTransaction,
        createdBy: Auth.User.Id | null,
        payload: Library.API.Folder.Create.Request,
    ): Promise<Library.Folder> {
        const row = await trx
            .insertInto('folders')
            .values({
                ...payload,
                created_by: createdBy,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.Folder.toDomain(row);
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(Library.Folder.Schema)
    async update(
        trx: DB.UserTransaction,
        payload: Library.API.Folder.Update.Request,
    ): Promise<Library.Folder> {
        const row = await trx
            .updateTable('folders')
            .set({
                display_name: payload.display_name,
                description: payload.description ?? null,
            })
            .where('id', '=', payload.id)
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.Folder.toDomain(row);
    }

    @AllowedDatabaseRoles("user")
    async delete(trx: DB.UserTransaction, id: Library.Folder.Id): Promise<void> {
        await trx
            .deleteFrom('folders')
            .where('id', '=', id)
            .execute();
    }

    @ZodReturn(z.object({
        folder: Library.Folder.Schema,
        child_folders: Library.Folder.Schema.array(),
        workflows: Library.WorkflowMeta.Schema.array(),
    }))
    @AllowedDatabaseRoles("user")
    async getContents(
        trx: DB.UserTransaction,
        id: Library.Folder.Id,
    ): Promise<Library.API.Folder.GetContents.Response> {
        const [folder, children, workflows] = await Promise.all([
            trx
                .selectFrom('folders')
                .selectAll()
                .where('id', '=', id)
                .executeTakeFirstOrThrow(),
            trx
                .selectFrom('folders')
                .selectAll()
                .where('parent_folder_id', '=', id)
                .execute(),
            trx
                .selectFrom('workflows')
                .select(WORKFLOW_META_COLUMNS)
                .where('folder_id', '=', id)
                .execute(),
        ]);

        return {
            folder: DB.Folder.toDomain(folder),
            child_folders: children.map(DB.Folder.toDomain),
            workflows: workflows.map(toWorkflowMeta),
        };
    }
}

@DatabaseClass
class WorkflowMethods {

    @AllowedDatabaseRoles("user")
    @ZodReturn(Workflow.Schema)
    async create(
        trx: DB.UserTransaction,
        createdBy: Auth.User.Id | null,
        payload: Library.API.Workflow.Create.Request,
    ): Promise<Workflow> {
        const row = await trx
            .insertInto('workflows')
            .values({
                ...payload,
                created_by: createdBy,
                locked: false,
                data: Workflow.INITIAL.data,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.Workflow.toDomain(row);
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(Library.WorkflowMeta.Schema)
    async update(
        trx: DB.UserTransaction,
        payload: Library.API.Workflow.Update.Request,
    ): Promise<Library.WorkflowMeta> {
        const row = await trx
            .updateTable('workflows')
            .set({
                ...(payload.display_name !== undefined && {
                    display_name: payload.display_name,
                }),
                ...(payload.description !== undefined && {
                    description: payload.description ?? null,
                }),
                ...(payload.icon !== undefined && { icon: payload.icon }),
                ...(payload.accent !== undefined && { accent: payload.accent }),
                ...(payload.icon_color !== undefined && {
                    icon_color: payload.icon_color,
                }),
                ...(payload.locked !== undefined && { locked: payload.locked }),
            })
            .where('id', '=', payload.id)
            .returning(WORKFLOW_META_COLUMNS)
            .executeTakeFirstOrThrow();

        return toWorkflowMeta(row);
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(Workflow.Schema)
    async get(
        trx: DB.UserTransaction,
        workflowId: Workflow.Id,
    ): Promise<Workflow> {
        const row = await trx
            .selectFrom('workflows')
            .selectAll()
            .where('id', '=', workflowId)
            .executeTakeFirstOrThrow();

        return DB.Workflow.toDomain(row);
    }

    @AllowedDatabaseRoles("user")
    async delete(trx: DB.UserTransaction, id: Workflow.Id): Promise<void> {
        await trx
            .deleteFrom('workflows')
            .where('id', '=', id)
            .execute();
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(Workflow.Schema)
    async duplicate(
        trx: DB.UserTransaction,
        createdBy: Auth.User.Id | null,
        id: Workflow.Id,
    ): Promise<Workflow> {
        const source = await trx
            .selectFrom('workflows')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirstOrThrow();

        const row = await trx
            .insertInto('workflows')
            .values({
                folder_id: source.folder_id,
                display_name: `Copy of ${source.display_name}`,
                description: source.description,
                icon: source.icon,
                accent: source.accent,
                icon_color: source.icon_color,
                data: source.data,
                created_by: createdBy,
                locked: false,
                mcp_enabled: source.mcp_enabled,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.Workflow.toDomain(row);
    }
}

@Injectable()
@DatabaseClass
export class LibraryDatabase {
    public readonly bootstrap = new BootstrapMethods();
    public readonly folder = new FolderMethods();
    public readonly workflow = new WorkflowMethods();
}
