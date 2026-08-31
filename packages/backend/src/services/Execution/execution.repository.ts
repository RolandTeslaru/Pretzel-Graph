import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { Chat, Execution, Workflow } from '@pretzel-graph/shared/domain';
import { SystemError } from '@pretzel-graph/shared/domain/SystemError';
import { DB } from '@/db';
import { Principal } from '@/domain/Principal';
import { Repository, Transactional } from '@/db/repository';
import { ZodReturn } from '../../decorators/database';

const META_COLUMNS = [
    'id',
    'workflow_id',
    'status',
    'duration',
    'error',
    'chat_id',
    'created_at',
    'updated_at',
] as const;

// The variant alone, so a webhook run's inbound request never leaves the row.
const metaSelection = [
    ...META_COLUMNS,
    sql<boolean>`recording is not null`.as('has_recording'),
    sql<Execution.Igniter.Variant>`igniter->>'variant'`.as('igniter_variant'),
] as const;

type RowPatch = {
    executionId: Execution.Id;
    status?: Execution.Status;
    duration?: number;
    error?: string;
    session?: Execution.Session;
    recording?: Execution.Recording | null;
};

class MetaMethods extends Repository {

    @Transactional('user')
    @ZodReturn(Execution.Meta)
    public async get(
        principal: Principal.User,
        executionId: Execution.Id,
    ): Promise<Execution.Meta> {
        const row = await this.trx
            .selectFrom('executions')
            .select(metaSelection)
            .where('id', '=', executionId)
            .executeTakeFirstOrThrow();

        return Execution.Meta.parse(row);
    }

    @Transactional('user')
    @ZodReturn(Execution.Meta.array())
    public async list(
        principal: Principal.User,
        workflowId: Workflow.Id,
    ): Promise<Execution.Meta[]> {
        const rows = await this.trx
            .selectFrom('executions')
            .select(metaSelection)
            .where('workflow_id', '=', workflowId)
            .orderBy('created_at', 'desc')
            .execute();

        return rows.map((row) => Execution.Meta.parse(row));
    }

    /** Non-terminal rows old enough that a live run would have a live job. */
    @Transactional('service')
    public async listStaleNonTerminal(principal: Principal.Service, olderThanMs: number): Promise<{ id: Execution.Id }[]> {
        const cutoff = new Date(Date.now() - olderThanMs).toISOString();

        const rows = await this.trx
            .selectFrom('executions')
            .select('id')
            .where('status', 'in', ['pending', 'running'])
            .where('created_at', '<', cutoff)
            .execute();

        return rows as { id: Execution.Id }[];
    }

    @Transactional('user')
    @ZodReturn(Execution.Meta.array())
    public async listActive(principal: Principal.User): Promise<Execution.Meta[]> {
        const rows = await this.trx
            .selectFrom('executions')
            .select(metaSelection)
            .where('status', 'in', ['pending', 'running'])
            .orderBy('created_at', 'desc')
            .execute();

        return rows.map((row) => Execution.Meta.parse(row));
    }
}

@Injectable()
export class ExecutionRepository extends Repository {
    public readonly meta = new MetaMethods();

    /** `created_by` is attribution only — null when a machine triggered the run. */
    @Transactional('user', 'service')
    public async create(
        principal: Principal.User | Principal.Service,
        props: {
            workflowId: Workflow.Id;
            igniter: Execution.Igniter;
            session: Execution.Session;
            executionId?: Execution.Id;
            chatId?: Chat.Id;
        },
    ): Promise<Execution.Meta> {
        const executionId = props.executionId ?? crypto.randomUUID() as Execution.Id;

        const row = await this.trx
            .insertInto('executions')
            .values({
                id: executionId,
                workflow_id: props.workflowId,
                created_by: principal.type === 'user' ? principal.userId : null,
                igniter: props.igniter,
                status: 'pending',
                duration: 0,
                session: props.session,
                chat_id: props.chatId ?? null,
                recording: null,
            })
            .returning(metaSelection)
            .executeTakeFirstOrThrow();

        return Execution.Meta.parse(row);
    }

    /**
     * Progress writes from a request or a running execution. RLS scopes the row to
     * the acting user, so a delegated write can only touch its own owner's execution.
     */
    @Transactional('user', 'delegate')
    public async updateProgress(
        principal: Principal.User | Principal.Delegate,
        props: Omit<RowPatch, 'error'>,
    ): Promise<Execution.Meta> {
        return this._applyRowPatch(props);
    }

    /**
     * Terminal writes with no principal behind them — the worker reporting a result,
     * a BullMQ failure, an enqueue that never reached a worker. Deliberately on the
     * service role: a wrong policy must never leave an execution unreapable.
     */
    @Transactional('service')
    public async finalise(
        principal: Principal.Service,
        props: RowPatch,
    ): Promise<Execution.Meta> {
        return this._applyRowPatch(props);
    }

    /**
     * Closes a run only while it is still open, returning the session alongside for
     * the failure event. A late write — a worker naming what it abandoned, a sweep —
     * must never overwrite an outcome that landed in the meantime.
     */
    @Transactional('service')
    public async failIfActive(
        principal: Principal.Service,
        executionId: Execution.Id,
        error: string,
    ): Promise<{ meta: Execution.Meta; session: Execution.Session } | undefined> {
        const row = await this.trx
            .updateTable('executions')
            .set({
                status: 'failed',
                error: new SystemError(SystemError.Code.INFRA_UNKNOWN, error).toJSON(),
            })
            .where('id', '=', executionId)
            .where('status', 'in', [...Execution.ACTIVE_STATUSES])
            .returning([...metaSelection, 'session'])
            .executeTakeFirst();

        if (row === undefined)
            return undefined;

        return {
            meta:    Execution.Meta.parse(row),
            session: Execution.Session.Schema.parse(row.session),
        };
    }

    @Transactional('user')
    @ZodReturn(Execution.Status)
    public async getStatus(
        principal: Principal.User,
        executionId: Execution.Id,
    ): Promise<Execution.Status> {
        const row = await this.trx
            .selectFrom('executions')
            .select('status')
            .where('id', '=', executionId)
            .executeTakeFirstOrThrow();

        return row.status;
    }

    @Transactional('user')
    @ZodReturn(Execution.Schema)
    public async get(
        principal: Principal.User,
        executionId: Execution.Id,
    ): Promise<Execution> {
        const row = await this.trx
            .selectFrom('executions')
            .selectAll()
            .where('id', '=', executionId)
            .executeTakeFirstOrThrow();

        return DB.Execution.toDomain(row);
    }

    @Transactional('user', 'service')
    @ZodReturn(Execution.Id.array())
    public async listActiveIds(principal: Principal.User | Principal.Service): Promise<Execution.Id[]> {
        const rows = await this.trx
            .selectFrom('executions')
            .select('id')
            .where('status', 'in', ['pending', 'running'])
            .execute();

        return rows.map((row) => row.id);
    }

    @Transactional('user', 'service')
    public async terminateMany(
        principal: Principal.User | Principal.Service,
        executionIds: Execution.Id[],
        error: string,
    ): Promise<Execution.Meta[]> {
        if (!executionIds.length)
            return [];

        const rows = await this.trx
            .updateTable('executions')
            .set({
                status: 'terminated',
                error: new SystemError(
                    SystemError.Code.INFRA_UNKNOWN,
                    error,
                ).toJSON(),
            })
            .where('id', 'in', executionIds)
            .returning(metaSelection)
            .execute();

        return rows.map((row) => Execution.Meta.parse(row));
    }

    // Column-granularity write shared by updateProgress and finalise — the columns are
    // the same, only who may write them differs. Distinct from Session.Patch, which is
    // a key-granularity delta: `session` here replaces the whole blob.
    private async _applyRowPatch(props: RowPatch): Promise<Execution.Meta> {
        const row = await this.trx
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
            .returning(metaSelection)
            .executeTakeFirstOrThrow();

        return Execution.Meta.parse(row);
    }
}
