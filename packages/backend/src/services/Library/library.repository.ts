import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Library, Workflow } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { Principal } from '@/domain/Principal';
import { Repository, Transactional } from '@/db/repository';
import { ZodReturn } from '../../decorators/database';

const WORKFLOW_META_COLUMNS = [
    'id',
    'folder_id',
    'display_name',
    'description',
    'icon',
    'accent',
    'icon_color',
    'locked',
    'hidden',
    'mcp_enabled',
    'created_at',
    'updated_at',
] as const;

const toWorkflowMeta = (row: unknown) => Library.WorkflowMeta.Schema.parse(row);

class BootstrapMethods extends Repository {

    @ZodReturn(z.object({
        folders: Library.Folder.Schema.array(),
        workflow_metas: Library.WorkflowMeta.Schema.array(),
    }))
    @Transactional('user')
    public async get(principal: Principal.User): Promise<Library.API.Bootstrap.Get.Response> {
        const [folders, workflowMetas] = await Promise.all([
            this.trx
                .selectFrom('folders')
                .selectAll()
                .orderBy('created_at', 'desc')
                .execute(),
            this.trx
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

class FolderMethods extends Repository {

    @Transactional('user')
    @ZodReturn(Library.Folder.Schema)
    public async create(
        principal: Principal.User,
        payload: Library.API.Folder.Create.Request,
    ): Promise<Library.Folder> {
        const row = await this.trx
            .insertInto('folders')
            .values({
                ...payload,
                created_by: principal.userId,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.Folder.toDomain(row);
    }

    @Transactional('user')
    @ZodReturn(Library.Folder.Schema)
    public async update(
        principal: Principal.User,
        payload: Library.API.Folder.Update.Request,
    ): Promise<Library.Folder> {
        const row = await this.trx
            .updateTable('folders')
            .set({
                ...(payload.display_name !== undefined && {
                    display_name: payload.display_name,
                }),
                ...(payload.description !== undefined && {
                    description: payload.description ?? null,
                }),
                ...(payload.hidden !== undefined && { hidden: payload.hidden || null }),
            })
            .where('id', '=', payload.id)
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.Folder.toDomain(row);
    }

    @Transactional('user')
    public async delete(principal: Principal.User, id: Library.Folder.Id): Promise<void> {
        await this.trx
            .deleteFrom('folders')
            .where('id', '=', id)
            .execute();
    }

    @ZodReturn(z.object({
        folder: Library.Folder.Schema,
        child_folders: Library.Folder.Schema.array(),
        workflows: Library.WorkflowMeta.Schema.array(),
    }))
    @Transactional('user')
    public async getContents(
        principal: Principal.User,
        id: Library.Folder.Id,
    ): Promise<Library.API.Folder.GetContents.Response> {
        const [folder, children, workflows] = await Promise.all([
            this.trx
                .selectFrom('folders')
                .selectAll()
                .where('id', '=', id)
                .executeTakeFirstOrThrow(),
            this.trx
                .selectFrom('folders')
                .selectAll()
                .where('parent_folder_id', '=', id)
                .execute(),
            this.trx
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

class WorkflowMethods extends Repository {

    @Transactional('user')
    @ZodReturn(Workflow.Schema)
    public async create(
        principal: Principal.User,
        payload: Library.API.Workflow.Create.Request,
    ): Promise<Workflow> {
        const row = await this.trx
            .insertInto('workflows')
            .values({
                ...payload,
                created_by: principal.userId,
                locked: false,
                data: Workflow.INITIAL.data,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.Workflow.toDomain(row);
    }

    @Transactional('user')
    @ZodReturn(Library.WorkflowMeta.Schema)
    public async update(
        principal: Principal.User,
        payload: Library.API.Workflow.Update.Request,
    ): Promise<Library.WorkflowMeta> {
        const row = await this.trx
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
                ...(payload.hidden !== undefined && { hidden: payload.hidden || null }),
            })
            .where('id', '=', payload.id)
            .returning(WORKFLOW_META_COLUMNS)
            .executeTakeFirstOrThrow();

        return toWorkflowMeta(row);
    }

    @Transactional('user')
    @ZodReturn(Workflow.Schema)
    public async get(
        principal: Principal.User,
        workflowId: Workflow.Id,
    ): Promise<Workflow> {
        const row = await this.trx
            .selectFrom('workflows')
            .selectAll()
            .where('id', '=', workflowId)
            .executeTakeFirstOrThrow();

        return DB.Workflow.toDomain(row);
    }

    @Transactional('user')
    public async delete(principal: Principal.User, id: Workflow.Id): Promise<void> {
        await this.trx
            .deleteFrom('workflows')
            .where('id', '=', id)
            .execute();
    }

    @Transactional('user')
    @ZodReturn(Workflow.Schema)
    public async duplicate(
        principal: Principal.User,
        id: Workflow.Id,
    ): Promise<Workflow> {
        const source = await this.trx
            .selectFrom('workflows')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirstOrThrow();

        const row = await this.trx
            .insertInto('workflows')
            .values({
                folder_id: source.folder_id,
                display_name: `Copy of ${source.display_name}`,
                description: source.description,
                icon: source.icon,
                accent: source.accent,
                icon_color: source.icon_color,
                data: source.data,
                created_by: principal.userId,
                locked: false,
                hidden: source.hidden,
                mcp_enabled: source.mcp_enabled,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.Workflow.toDomain(row);
    }
}

@Injectable()
export class LibraryRepository {
    public readonly bootstrap = new BootstrapMethods();
    public readonly folder = new FolderMethods();
    public readonly workflow = new WorkflowMethods();
}
