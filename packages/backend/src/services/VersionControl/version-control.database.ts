import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { z } from 'zod';
import { Auth, VersionControl, Workflow } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { ZodReturn } from '../../decorators/database';
import { AllowedDatabaseRoles, DatabaseClass } from '../../decorators/database-roles';

const META_COLUMNS = ['id', 'workflow_id', 'version', 'name', 'description', 'is_active', 'published_at'] as const;

@Injectable()
@DatabaseClass
export class VersionControlDatabase {

    @AllowedDatabaseRoles("user")
    @ZodReturn(VersionControl.Publication.Schema)
    async publish(trx: DB.UserTransaction, userId: Auth.User.Id, { workflowId, name, description, workflowData }: VersionControl.API.Publish.Request): Promise<VersionControl.Publication> {
        // Named-arg notation picks the 5-arg overload; there is a 3-arg one too.
        const { rows } = await sql<DB.VersionControl.Row>`
            select * from publish_workflow(
                p_workflow_id   => ${workflowId}::uuid,
                p_user_id       => ${userId}::uuid,
                p_name          => ${name}::text,
                p_description   => ${description ?? null}::text,
                p_workflow_data => ${JSON.stringify(workflowData)}::jsonb
            )
        `.execute(trx);

        return DB.VersionControl.toDomain(rows[0]);
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(VersionControl.Publication.Meta.Schema.array())
    async list(trx: DB.UserTransaction, { workflowId }: VersionControl.API.List.Request): Promise<VersionControl.Publication.Meta[]> {
        // No user_id filter: the SELECT policy also exposes active publications
        // of public workflows, which this endpoint relies on.
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
    async listActiveWorkflows(trx: DB.UserTransaction, userId: Auth.User.Id): Promise<Record<Workflow.Id, VersionControl.Publication.Meta>> {
        const rows = await trx
            .selectFrom('version_control')
            .select(META_COLUMNS)
            .where('user_id', '=', userId)
            .where('is_active', '=', true)
            .orderBy('published_at', 'desc')
            .execute();

        return Object.fromEntries(
            rows.map((row) => [row.workflow_id, DB.VersionControl.toMeta(row)]),
        ) as Record<Workflow.Id, VersionControl.Publication.Meta>;
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(VersionControl.Publication.Meta.Schema.nullable())
    async getActiveByWorkflow(trx: DB.UserTransaction, userId: Auth.User.Id, { workflowId }: VersionControl.API.GetActiveByWorkflow.Request): Promise<VersionControl.Publication.Meta | null> {
        const row = await trx
            .selectFrom('version_control')
            .select(META_COLUMNS)
            .where('user_id', '=', userId)
            .where('workflow_id', '=', workflowId)
            .where('is_active', '=', true)
            .executeTakeFirst();

        return row ? DB.VersionControl.toMeta(row) : null;
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(VersionControl.Publication.Schema)
    async get(trx: DB.UserTransaction, { publicationId }: VersionControl.API.Get.Request): Promise<VersionControl.Publication> {
        const row = await trx
            .selectFrom('version_control')
            .selectAll()
            .where('id', '=', publicationId)
            .executeTakeFirstOrThrow();

        return DB.VersionControl.toDomain(row);
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(VersionControl.Publication.Schema)
    async activate(trx: DB.UserTransaction, { publicationId }: VersionControl.API.Activate.Request): Promise<VersionControl.Publication> {
        // SECURITY INVOKER — resolves through RLS, so it only works inside a scope.
        const { rows } = await sql<DB.VersionControl.Row>`
            select * from activate_publication(${publicationId}::uuid)
        `.execute(trx);

        return DB.VersionControl.toDomain(rows[0]);
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(VersionControl.Publication.Schema)
    async deactivate(trx: DB.UserTransaction, { publicationId }: VersionControl.API.Deactivate.Request): Promise<VersionControl.Publication> {
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
    async remove(trx: DB.UserTransaction, { publicationId }: VersionControl.API.Remove.Request): Promise<{ workflowId: Workflow.Id; wasActive: boolean }> {
        const row = await trx
            .deleteFrom('version_control')
            .where('id', '=', publicationId)
            .returning(['workflow_id', 'is_active'])
            .executeTakeFirstOrThrow();

        return { workflowId: row.workflow_id, wasActive: row.is_active };
    }
}
