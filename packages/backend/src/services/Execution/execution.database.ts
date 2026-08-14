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

type RowPatch = {
    executionId: Execution.Id;
    status?: Execution.Status;
    duration?: number;
    error?: string;
    session?: Execution.Session;
    recording?: Execution.Recording | null;
};

// Column-granularity write shared by updateProgress and finalise — the columns are the
// same, only who may write them differs. Distinct from Session.Patch, which is a
// key-granularity delta: `session` here replaces the whole blob. Module-level so
// @DatabaseClass doesn't treat it as a method.
async function applyRowPatch(trx: DB.Transaction<DB.Role>, props: RowPatch): Promise<void> {
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

    @AllowedDatabaseRoles("user")
    async create(
        trx: DB.UserTransaction,
        props: {
            workflowId: Workflow.Id;
            createdBy: Auth.User.Id | null;
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
                created_by: props.createdBy,
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

    /**
     * Progress writes from a request or a running execution. RLS scopes the row to
     * the acting user, so a delegated write can only touch its own owner's execution.
     */
    @AllowedDatabaseRoles("user", "delegate")
    async updateProgress(
        trx: DB.Transaction<'user' | 'delegate'>,
        props: Omit<RowPatch, 'error'>,
    ): Promise<void> {
        await applyRowPatch(trx, props);
    }

    /**
     * Terminal writes with no principal behind them — the worker reporting a result,
     * a BullMQ failure, an enqueue that never reached a worker. Deliberately on the
     * service role: a wrong policy must never leave an execution unreapable.
     */
    @AllowedDatabaseRoles("service")
    async finalise(
        trx: DB.Transaction<'service'>,
        props: RowPatch,
    ): Promise<void> {
        await applyRowPatch(trx, props);
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
