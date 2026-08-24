import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Auth, VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { ZodReturn } from '../../decorators/database';
import { AllowedDatabaseRoles, DatabaseClass } from '../../decorators/database-roles';

const META_COLUMNS = ['id', 'workflow_id', 'version', 'name', 'description', 'workflow_meta', 'is_active', 'published_at'] as const;

@Injectable()
@DatabaseClass
export class VersionControlDatabase {

    @AllowedDatabaseRoles("user")
    @ZodReturn(VersionControl.Publication.Schema)
    async publish(trx: DB.UserTransaction, createdBy: Auth.User.Id | null, workflowId: Workflow.Id, { name, description, workflowData }: VersionControl.API.Publish.Request): Promise<VersionControl.Publication> {
        await trx
            .updateTable('version_control')
            .set({ is_active: false })
            .where('workflow_id', '=', workflowId)
            .where('is_active', '=', true)
            .execute();

        const latest = await trx
            .selectFrom('version_control')
            .select(({ fn }) => fn.max('version').as('version'))
            .where('workflow_id', '=', workflowId)
            .executeTakeFirst();

        // Snapshot of the workflow row at publish time, graph excluded.
        const workflow = await trx
            .selectFrom('workflows')
            .selectAll()
            .where('id', '=', workflowId)
            .executeTakeFirstOrThrow();

        const row = await trx
            .insertInto('version_control')
            .values({
                workflow_id:   workflowId,
                created_by:    createdBy,
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

    @AllowedDatabaseRoles("user")
    @ZodReturn(VersionControl.Publication.Meta.Schema.array())
    async list(trx: DB.UserTransaction, workflowId: Workflow.Id): Promise<VersionControl.Publication.Meta[]> {
        const rows = await trx
            .selectFrom('version_control')
            .select(META_COLUMNS)
            .where('workflow_id', '=', workflowId)
            .orderBy('version', 'desc')
            .execute();

        return rows.map(DB.VersionControl.toMeta);
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(z.record(Workflow.Id, VersionControl.Publication.Meta.Schema))
    async listActiveWorkflows(trx: DB.UserTransaction): Promise<Record<Workflow.Id, VersionControl.Publication.Meta>> {
        const rows = await trx
            .selectFrom('version_control')
            .select(META_COLUMNS)
            .where('is_active', '=', true)
            .orderBy('published_at', 'desc')
            .execute();

        return Object.fromEntries(
            rows.map((row) => [row.workflow_id, DB.VersionControl.toMeta(row)]),
        ) as Record<Workflow.Id, VersionControl.Publication.Meta>;
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(VersionControl.Publication.Meta.Schema.nullable())
    async getActiveByWorkflow(trx: DB.UserTransaction, workflowId: Workflow.Id): Promise<VersionControl.Publication.Meta | null> {
        const row = await trx
            .selectFrom('version_control')
            .select(META_COLUMNS)
            .where('workflow_id', '=', workflowId)
            .where('is_active', '=', true)
            .executeTakeFirst();

        return row ? DB.VersionControl.toMeta(row) : null;
    }

    // Full row, workflow_data included.
    @AllowedDatabaseRoles("user")
    @ZodReturn(VersionControl.Publication.Schema.nullable())
    async getActivePublicationForWorkflow(trx: DB.UserTransaction, workflowId: Workflow.Id): Promise<VersionControl.Publication | null> {
        const row = await trx
            .selectFrom('version_control')
            .selectAll()
            .where('workflow_id', '=', workflowId)
            .where('is_active', '=', true)
            .executeTakeFirst();

        return row ? DB.VersionControl.toDomain(row) : null;
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(VersionControl.Publication.Schema)
    async get(trx: DB.UserTransaction, publicationId: VersionControl.Publication.Id): Promise<VersionControl.Publication> {
        const row = await trx
            .selectFrom('version_control')
            .selectAll()
            .where('id', '=', publicationId)
            .executeTakeFirstOrThrow();

        return DB.VersionControl.toDomain(row);
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(VersionControl.Publication.Schema)
    async activate(trx: DB.UserTransaction, publicationId: VersionControl.Publication.Id): Promise<VersionControl.Publication> {
        const target = await trx
            .selectFrom('version_control')
            .select('workflow_id')
            .where('id', '=', publicationId)
            .executeTakeFirstOrThrow();

        await trx
            .updateTable('version_control')
            .set({ is_active: false })
            .where('workflow_id', '=', target.workflow_id)
            .where('is_active', '=', true)
            .where('id', '!=', publicationId)
            .execute();

        const row = await trx
            .updateTable('version_control')
            .set({ is_active: true })
            .where('id', '=', publicationId)
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.VersionControl.toDomain(row);
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(VersionControl.Publication.Schema)
    async deactivate(trx: DB.UserTransaction, publicationId: VersionControl.Publication.Id): Promise<VersionControl.Publication> {
        const row = await trx
            .updateTable('version_control')
            .set({ is_active: false })
            .where('id', '=', publicationId)
            .returningAll()
            .executeTakeFirstOrThrow();

        return DB.VersionControl.toDomain(row);
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(z.object({ workflowId: Workflow.Id, wasActive: z.boolean() }))
    async remove(trx: DB.UserTransaction, publicationId: VersionControl.Publication.Id): Promise<{ workflowId: Workflow.Id; wasActive: boolean }> {
        const row = await trx
            .deleteFrom('version_control')
            .where('id', '=', publicationId)
            .returning(['workflow_id', 'is_active'])
            .executeTakeFirstOrThrow();

        return { workflowId: row.workflow_id, wasActive: row.is_active };
    }
}
