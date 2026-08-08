import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { Auth, Chat, Execution, Workflow } from '@pretzel-graph/shared/domain';
import { SystemError } from '@pretzel-graph/shared/domain/SystemError';
import { DB } from '@/db';
import { ZodReturn } from '../../decorators/database';
import { AllowedDatabaseRoles, DatabaseClass } from '../../decorators/database-roles';

const META_COLUMNS = [
    'id',
    'workflow_id',
    'igniter',
    'status',
    'duration',
    'error',
    'chat_id',
    'created_at',
    'updated_at',
] as const;

const metaSelection = [
    ...META_COLUMNS,
    sql<boolean>`recording is not null`.as('has_recording'),
] as const;

@DatabaseClass
class MetaMethods {

    @AllowedDatabaseRoles("user")
    @ZodReturn(Execution.Meta)
    async get(
        trx: DB.UserTransaction,
        executionId: Execution.Id,
    ): Promise<Execution.Meta> {
        const row = await trx
            .selectFrom('executions')
            .select(metaSelection)
            .where('id', '=', executionId)
            .executeTakeFirstOrThrow();

        return Execution.Meta.parse(row);
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(Execution.Meta.array())
    async list(
        trx: DB.UserTransaction,
        workflowId: Workflow.Id,
    ): Promise<Execution.Meta[]> {
        const rows = await trx
            .selectFrom('executions')
            .select(metaSelection)
            .where('workflow_id', '=', workflowId)
            .orderBy('created_at', 'desc')
            .execute();

        return rows.map((row) => Execution.Meta.parse(row));
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(Execution.Meta.array())
    async listActive(trx: DB.UserTransaction): Promise<Execution.Meta[]> {
        const rows = await trx
            .selectFrom('executions')
            .select(metaSelection)
            .where('status', 'in', ['pending', 'running'])
            .orderBy('created_at', 'desc')
            .execute();

        return rows.map((row) => Execution.Meta.parse(row));
    }
}

@Injectable()
@DatabaseClass
export class ExecutionDatabase {
    public readonly meta = new MetaMethods();

    @AllowedDatabaseRoles("user", "service")
    async create(
        trx: DB.Transaction<'user' | 'service'>,
        props: {
            workflowId: Workflow.Id;
            userId: Auth.User.Id;
            igniter: Execution.Igniter;
            session: Execution.Session;
            executionId?: Execution.Id;
            chatId?: Chat.Id;
        },
    ): Promise<Execution.Id> {
        const executionId = props.executionId ?? crypto.randomUUID() as Execution.Id;

        await trx
            .insertInto('executions')
            .values({
                id: executionId,
                workflow_id: props.workflowId,
                user_id: props.userId,
                igniter: props.igniter,
                status: 'pending',
                duration: 0,
                session: props.session,
                chat_id: props.chatId ?? null,
                recording: null,
            })
            .execute();

        return executionId;
    }

    @AllowedDatabaseRoles("user", "service")
    async update(
        trx: DB.Transaction<'user' | 'service'>,
        props: {
            executionId: Execution.Id;
            status?: Execution.Status;
            duration?: number;
            error?: string;
            session?: Execution.Session.Update;
            recording?: Execution.Recording | null;
        },
    ): Promise<void> {
        await trx
            .updateTable('executions')
            .set({
                ...(props.status !== undefined && { status: props.status }),
                ...(props.duration !== undefined && { duration: props.duration }),
                ...(props.error !== undefined && {
                    error: new SystemError(
                        SystemError.Code.INFRA_UNKNOWN,
                        props.error,
                    ).toJSON(),
                }),
                ...(props.session !== undefined && { session: props.session }),
                ...(props.recording !== undefined && { recording: props.recording }),
            })
            .where('id', '=', props.executionId)
            .execute();
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(Execution.Status)
    async getStatus(
        trx: DB.UserTransaction,
        executionId: Execution.Id,
    ): Promise<Execution.Status> {
        const row = await trx
            .selectFrom('executions')
            .select('status')
            .where('id', '=', executionId)
            .executeTakeFirstOrThrow();

        return row.status;
    }

    @AllowedDatabaseRoles("user")
    @ZodReturn(Execution.Schema)
    async get(
        trx: DB.UserTransaction,
        executionId: Execution.Id,
    ): Promise<Execution> {
        const row = await trx
            .selectFrom('executions')
            .selectAll()
            .where('id', '=', executionId)
            .executeTakeFirstOrThrow();

        return DB.Execution.toDomain(row);
    }

    @AllowedDatabaseRoles("user", "service")
    @ZodReturn(Workflow.Data.Schema)
    async getActivePublishedWorkflowData(
        trx: DB.Transaction<'user' | 'service'>,
        workflowId: Workflow.Id,
    ): Promise<Workflow.Data> {
        const row = await trx
            .selectFrom('version_control')
            .select('workflow_data')
            .where('workflow_id', '=', workflowId)
            .where('is_active', '=', true)
            .executeTakeFirst();

        if (!row)
            throw new SystemError(
                SystemError.Code.NOT_FOUND,
                'No active published version found for this workflow',
            );

        return Workflow.Data.Schema.parse(row.workflow_data);
    }

    @AllowedDatabaseRoles("user", "service")
    @ZodReturn(Execution.Id.array())
    async listActiveIds(trx: DB.Transaction<'user' | 'service'>): Promise<Execution.Id[]> {
        const rows = await trx
            .selectFrom('executions')
            .select('id')
            .where('status', 'in', ['pending', 'running'])
            .execute();

        return rows.map((row) => row.id);
    }

    @AllowedDatabaseRoles("user", "service")
    async terminateMany(
        trx: DB.Transaction<'user' | 'service'>,
        executionIds: Execution.Id[],
        error: string,
    ): Promise<void> {
        if (!executionIds.length)
            return;

        await trx
            .updateTable('executions')
            .set({
                status: 'terminated',
                error: new SystemError(
                    SystemError.Code.INFRA_UNKNOWN,
                    error,
                ).toJSON(),
            })
            .where('id', 'in', executionIds)
            .execute();
    }
}
