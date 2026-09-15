import { z } from 'zod';
import { Dependency, Library, Skill } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { Principal } from '@/domain/Principal';
import { Repository, Transactional } from '@/db/repository';
import { ZodReturn } from '@/decorators/database';

export const SKILL_META_COLUMNS = [
    'id',
    'folder_id',
    'name',
    'description',
    'content_hash',
    'icon',
    'accent',
    'created_by',
    'created_at',
    'updated_at',
] as const;

export const toSkillMeta = (row: unknown) => Skill.Meta.Schema.parse(row);

export class SkillRepository extends Repository {

    @Transactional('user')
    @ZodReturn(Skill.Schema)
    public async create(
        principal: Principal.User,
        payload: Library.API.Skill.Create.Request,
    ): Promise<Skill> {
        const row = await this.trx
            .insertInto('skills')
            .values({
                ...payload,
                created_by: principal.userId,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.Skill.toDomain(row);
    }

    @Transactional('user')
    @ZodReturn(Skill.Schema)
    public async get(
        principal: Principal.User,
        id: Skill.Id,
    ): Promise<Skill> {
        const row = await this.trx
            .selectFrom('skills')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirstOrThrow();

        return DB.Skill.toDomain(row);
    }

    // Skills whose content hash moved on from the one each snapshot was taken at.
    @Transactional('user')
    @ZodReturn(z.array(Dependency.Update.Skill.Schema))
    public async checkUpdates(
        principal: Principal.User,
        dependencies: Array<Pick<Dependency.Update.Skill, 'id' | 'content_hash'>>,
    ): Promise<Dependency.Update.Skill[]> {
        if (!dependencies.length)
            return [];

        const snapshotContentHash = new Map(
            dependencies.map((dependency) => [
                dependency.id,
                dependency.content_hash,
            ]),
        );
        const skillIds = dependencies.map((dependency) => dependency.id);

        const rows = await this.trx
            .selectFrom('skills')
            .select(['id', 'name', 'content_hash', 'updated_at'])
            .where('id', 'in', skillIds)
            .execute();

        const updates: Dependency.Update.Skill[] = [];

        for (const row of rows) {
            if (snapshotContentHash.get(row.id) === row.content_hash)
                continue;

            updates.push({
                kind: "skill",
                id: row.id,
                name: row.name,
                content_hash: row.content_hash,
                updated_at: new Date(row.updated_at),
            });
        }

        return updates;
    }

    @Transactional('user')
    @ZodReturn(Skill.Schema)
    public async update(
        principal: Principal.User,
        payload: Library.API.Skill.Update.Request,
    ): Promise<Skill> {
        const row = await this.trx
            .updateTable('skills')
            .set({
                ...(payload.name !== undefined && { name: payload.name }),
                ...(payload.description !== undefined && { description: payload.description }),
                ...(payload.content !== undefined && { content: payload.content }),
                ...(payload.icon !== undefined && { icon: payload.icon }),
                ...(payload.accent !== undefined && { accent: payload.accent }),
                ...(payload.folder_id !== undefined && { folder_id: payload.folder_id }),
            })
            .where('id', '=', payload.id)
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.Skill.toDomain(row);
    }

    @Transactional('user')
    public async delete(principal: Principal.User, id: Skill.Id): Promise<void> {
        await this.trx
            .deleteFrom('skills')
            .where('id', '=', id)
            .execute();
    }
}
