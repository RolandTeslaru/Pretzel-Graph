import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { Principal } from '@/domain/Principal';
import { Repository, Transactional } from '@/db/repository';
import { ZodReturn } from '../../decorators/database';

const META_COLUMNS = ['id', 'workflow_id', 'version', 'name', 'description', 'workflow_meta', 'is_active', 'published_at'] as const;

@Injectable()
export class VersionControlRepository extends Repository {

    @Transactional('user')
    @ZodReturn(VersionControl.Publication.Schema)
    public async publish(principal: Principal.User, workflowId: Workflow.Id, { name, description, workflowData }: VersionControl.API.Publish.Request): Promise<VersionControl.Publication> {
        await this.trx
            .updateTable('version_control')
            .set({ is_active: false })
            .where('workflow_id', '=', workflowId)
            .where('is_active', '=', true)
            .execute();

        const latest = await this.trx
            .selectFrom('version_control')
            .select(({ fn }) => fn.max('version').as('version'))
            .where('workflow_id', '=', workflowId)
            .executeTakeFirst();

        // Snapshot of the workflow row at publish time, graph excluded.
        const workflow = await this.trx
            .selectFrom('workflows')
            .selectAll()
            .where('id', '=', workflowId)
            .executeTakeFirstOrThrow();

        const row = await this.trx
            .insertInto('version_control')
            .values({
                workflow_id:   workflowId,
                created_by:    principal.userId,
                version:       (latest?.version ?? 0) + 1,
                name,
                description:   description ?? null,
                workflow_meta: Workflow.Meta.Schema.parse(workflow),
                workflow_data: workflowData,
                is_active:     true,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.VersionControl.toDomain(row);
    }

    @Transactional('user')
    @ZodReturn(VersionControl.Publication.Meta.Schema.array())
    public async list(principal: Principal.User, workflowId: Workflow.Id): Promise<VersionControl.Publication.Meta[]> {
        const rows = await this.trx
            .selectFrom('version_control')
            .select(META_COLUMNS)
            .where('workflow_id', '=', workflowId)
            .orderBy('version', 'desc')
            .execute();

        return rows.map(DB.VersionControl.toMeta);
    }

    @Transactional('user')
    @ZodReturn(z.record(Workflow.Id, VersionControl.Publication.Meta.Schema))
    public async listActiveWorkflows(principal: Principal.User): Promise<Record<Workflow.Id, VersionControl.Publication.Meta>> {
        const rows = await this.trx
            .selectFrom('version_control')
            .select(META_COLUMNS)
            .where('is_active', '=', true)
            .orderBy('published_at', 'desc')
            .execute();

        return Object.fromEntries(
            rows.map((row) => [row.workflow_id, DB.VersionControl.toMeta(row)]),
        ) as Record<Workflow.Id, VersionControl.Publication.Meta>;
    }

    @Transactional('user')
    @ZodReturn(VersionControl.Publication.Meta.Schema.nullable())
    public async getActiveByWorkflow(principal: Principal.User, workflowId: Workflow.Id): Promise<VersionControl.Publication.Meta | null> {
        const row = await this.trx
            .selectFrom('version_control')
            .select(META_COLUMNS)
            .where('workflow_id', '=', workflowId)
            .where('is_active', '=', true)
            .executeTakeFirst();

        return row ? DB.VersionControl.toMeta(row) : null;
    }

    // Full row, workflow_data included.
    @Transactional('user')
    @ZodReturn(VersionControl.Publication.Schema.nullable())
    public async getActivePublicationForWorkflow(principal: Principal.User, workflowId: Workflow.Id): Promise<VersionControl.Publication | null> {
        const row = await this.trx
            .selectFrom('version_control')
            .selectAll()
            .where('workflow_id', '=', workflowId)
            .where('is_active', '=', true)
            .executeTakeFirst();

        return row ? DB.VersionControl.toDomain(row) : null;
    }

    @Transactional('user')
    @ZodReturn(VersionControl.Publication.Schema)
    public async get(principal: Principal.User, publicationId: VersionControl.Publication.Id): Promise<VersionControl.Publication> {
        const row = await this.trx
            .selectFrom('version_control')
            .selectAll()
            .where('id', '=', publicationId)
            .executeTakeFirstOrThrow();

        return DB.VersionControl.toDomain(row);
    }

    @Transactional('user')
    @ZodReturn(VersionControl.Publication.Schema)
    public async activate(principal: Principal.User, publicationId: VersionControl.Publication.Id): Promise<VersionControl.Publication> {
        const target = await this.trx
            .selectFrom('version_control')
            .select('workflow_id')
            .where('id', '=', publicationId)
            .executeTakeFirstOrThrow();

        await this.trx
            .updateTable('version_control')
            .set({ is_active: false })
            .where('workflow_id', '=', target.workflow_id)
            .where('is_active', '=', true)
            .where('id', '!=', publicationId)
            .execute();

        const row = await this.trx
            .updateTable('version_control')
            .set({ is_active: true })
            .where('id', '=', publicationId)
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.VersionControl.toDomain(row);
    }

    @Transactional('user')
    @ZodReturn(VersionControl.Publication.Schema)
    public async deactivate(principal: Principal.User, publicationId: VersionControl.Publication.Id): Promise<VersionControl.Publication> {
        const row = await this.trx
            .updateTable('version_control')
            .set({ is_active: false })
            .where('id', '=', publicationId)
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.VersionControl.toDomain(row);
    }

    @Transactional('user')
    @ZodReturn(z.object({ workflowId: Workflow.Id, wasActive: z.boolean() }))
    public async remove(principal: Principal.User, publicationId: VersionControl.Publication.Id): Promise<{ workflowId: Workflow.Id; wasActive: boolean }> {
        const row = await this.trx
            .deleteFrom('version_control')
            .where('id', '=', publicationId)
            .returning(['workflow_id', 'is_active'])
            .executeTakeFirstOrThrow();

        return { workflowId: row.workflow_id, wasActive: row.is_active };
    }
}
