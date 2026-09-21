import { z } from 'zod';
import { Gateway, Library, Skill } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { Principal } from '@/domain/Principal';
import { Repository, Transactional } from '@/db/repository';
import { ZodReturn } from '@/decorators/database';
import { WORKFLOW_META_COLUMNS, toWorkflowMeta } from './workflow.repository';
import { SKILL_META_COLUMNS, toSkillMeta } from './skill.repository';

export class FolderRepository extends Repository {

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
                ...(payload.parent_folder_id !== undefined && { parent_folder_id: payload.parent_folder_id }),
            })
            .where('id', '=', payload.id)
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.Folder.toDomain(row);
    }

    // Walks up from `folderId` to the root and reports whether `ancestorId` is on the path.
    @Transactional('user')
    public async isSelfOrDescendant(principal: Principal.User, folderId: Library.Folder.Id, ancestorId: Library.Folder.Id): Promise<boolean> {
        const rows = await this.trx
            .selectFrom('folders')
            .select(['id', 'parent_folder_id'])
            .execute();

        const parentOf = new Map(rows.map((r) => [r.id, r.parent_folder_id]));

        let cursor: Library.Folder.Id | null = folderId;

        while (cursor) {
            if (cursor === ancestorId) return true;
            cursor = parentOf.get(cursor) ?? null;
        }

        return false;
    }

    // Every connection in the folder or any folder below it; each one blocks the folder's delete.
    @Transactional('user')
    @ZodReturn(Gateway.Connection.Id.array())
    public async listNestedConnectionIds(principal: Principal.User, id: Library.Folder.Id): Promise<Gateway.Connection.Id[]> {
        const rows = await this.trx
            .withRecursive('subtree(id)', db => db
                .selectFrom('folders')
                .select('id')
                .where('id', '=', id)
                .unionAll(db
                    .selectFrom('folders')
                    .innerJoin('subtree', 'subtree.id', 'folders.parent_folder_id')
                    .select('folders.id')))
            .selectFrom('connections')
            .innerJoin('subtree', 'subtree.id', 'connections.folder_id')
            .select('connections.id')
            .execute();

        return rows.map(row => row.id);
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
        skills: Skill.Meta.Schema.array(),
    }))
    @Transactional('user')
    public async getContents(
        principal: Principal.User,
        id: Library.Folder.Id,
    ): Promise<Library.API.Folder.GetContents.Response> {
        const [folder, children, workflows, skills] = await Promise.all([
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
            this.trx
                .selectFrom('skills')
                .select(SKILL_META_COLUMNS)
                .where('folder_id', '=', id)
                .execute(),
        ]);

        return {
            folder: DB.Folder.toDomain(folder),
            child_folders: children.map(DB.Folder.toDomain),
            workflows: workflows.map(toWorkflowMeta),
            skills: skills.map(toSkillMeta),
        };
    }
}
