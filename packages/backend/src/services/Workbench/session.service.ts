import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { sql } from 'kysely';
import { Execution, SystemError, Workbench, Workflow } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { Principal } from '@/domain/Principal';
import { RealtimeService } from '../Realtime/realtime.service';
import { ShelfService } from '../Shelf/shelf.service';
import { WorkbenchRepository } from './workbench.repository';

// A worker-side hold on a workflow. The row is locked by one transaction kept open from begin
// to commit; the run edits its own copy and sends the result back whole. Postgres is the lock:
// a dead connection releases it, and the idle timeout below reaps a caller that stops
// heartbeating. Edits the run announces on its own channel are relayed onto the workflow's.
//
// One session per workflow at a time — the row lock guarantees it — recorded with the execution
// that holds it, so only that execution may heartbeat, commit, or abort it. A second begin is
// refused whoever asks, before Postgres has to block on it.

type Session = {
    trx:         DB.HeldDelegateTransaction,
    workflowId:  Workflow.Id,
    executionId: Execution.Id,
    meta:        Workflow.Meta,
    unsubscribe: () => void,
};

const toMeta = ({ data: _data, ...meta }: Workflow): Workflow.Meta => meta;

const IDLE_TIMEOUT = '60s';

const isLockNotAvailable = (error: unknown) => (error as { code?: string })?.code === '55P03';

@Injectable()
export class WorkbenchSessionService implements OnModuleDestroy {

    private readonly sessions = new Map<Workflow.Id, Session>();

    constructor(
        private readonly realtime:     RealtimeService,
        private readonly shelfService: ShelfService,
        private readonly repository:   WorkbenchRepository,
    ) {}




    public isLocked(workflowId: Workflow.Id): boolean {
        return this.sessions.has(workflowId);
    }




    /** The row without its graph; `locked` from the registry, as everywhere else. */
    public async readMeta(delegate: Principal.Delegate, workflowId: Workflow.Id): Promise<Workflow.Meta> {
        const session = this.sessions.get(workflowId);

        if (session && session.executionId === delegate.executionId)
            return { ...session.meta, locked: true };

        const workflow = await this.repository.workflow.get(delegate, workflowId);

        return { ...toMeta(workflow), locked: this.isLocked(workflowId) };
    }




    public async beginTransaction(delegate: Principal.Delegate, workflowId: Workflow.Id): Promise<Workbench.API.Session.Begin.Response> {

        const existing = this.sessions.get(workflowId);

        if (existing)
            throw new SystemError(SystemError.Code.CONFLICT, `Workflow is held by execution ${existing.executionId}`);

        const trx = await DB.beginHeldDelegate();

        try {
            await sql`set local idle_in_transaction_session_timeout = ${sql.lit(IDLE_TIMEOUT)}`.execute(trx);

            const row = await trx
                .selectFrom('workflows')
                .selectAll()
                .where('id', '=', workflowId)
                .forUpdate()
                .noWait()
                .executeTakeFirst();

            if (!row)
                throw new SystemError(SystemError.Code.NOT_FOUND, 'Workflow not found');

            const workflow = DB.Workflow.toDomain(row);

            const session: Session = {
                trx,
                workflowId,
                executionId: delegate.executionId,
                meta:        toMeta(workflow),
                // The run's own channel carries both its lifecycle and the edits it makes.
                unsubscribe: this.realtime.subscribe<Execution.Event>(
                    Execution.Event.getChannel(delegate.executionId),
                    event => this.onExecutionEvent(session, event),
                ),
            };

            this.sessions.set(workflowId, session);

            this.emit(session, { type: 'lock:acquired' });

            return this.snapshot(workflow, true);
        }
        catch (error) {
            await trx.rollback().execute().catch(() => {});

            if (isLockNotAvailable(error))
                throw new SystemError(SystemError.Code.CONFLICT, 'Workflow is held by another writer');

            throw error;
        }
    }




    public async heartbeat(delegate: Principal.Delegate, workflowId: Workflow.Id): Promise<void> {
        const session = this.require(delegate, workflowId);

        try {
            await sql`select 1`.execute(session.trx);
        }
        catch (error) {
            this.forget(session);
            throw new SystemError(SystemError.Code.CONFLICT, 'Session expired');
        }
    }




    public async commitTransaction(delegate: Principal.Delegate, workflowId: Workflow.Id, data: Workflow.Data): Promise<void> {
        const session = this.require(delegate, workflowId);

        try {
            await session.trx
                .updateTable('workflows')
                .set({ data })
                .where('id', '=', workflowId)
                .execute();

            await session.trx.commit().execute();
        }
        catch (error) {
            await session.trx.rollback().execute().catch(() => {});
            this.forget(session);
            throw new SystemError(SystemError.Code.CONFLICT, 'Session expired before commit');
        }

        this.forget(session);
    }




    public async abortTransaction(delegate: Principal.Delegate, workflowId: Workflow.Id): Promise<void> {
        await this.abandon(this.require(delegate, workflowId));
    }




    /** Everything a finished execution still holds. */
    public async releaseExecution(executionId: Execution.Id): Promise<void> {
        for (const session of [...this.sessions.values()])
            if (session.executionId === executionId)
                await this.abandon(session);
    }




    public async onModuleDestroy() {
        for (const session of [...this.sessions.values()])
            await this.abandon(session);
    }




    // An edit is relayed only for the workflow this session holds; a terminal state releases it.
    private onExecutionEvent(session: Session, event: Execution.Event) {
        if (event.type === 'workbench:edit') {
            if (event.targetWorkflowId === session.workflowId)
                this.emit(session, event.edit);

            return;
        }

        if (Execution.Event.TERMINAL.has(event.type))
            void this.releaseExecution(session.executionId);
    }




    private require(delegate: Principal.Delegate, workflowId: Workflow.Id): Session {
        const session = this.sessions.get(workflowId);

        if (!session || session.executionId !== delegate.executionId)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'No open session for this workflow');

        return session;
    }




    private async snapshot(workflow: Workflow, locked: boolean): Promise<Workbench.API.Session.Begin.Response> {
        const { blueprints, repairs } = await this.shelfService.collectWorkflowBlueprints(workflow.data);

        return { workflow: { ...workflow, locked }, blueprints, repairs };
    }




    private emit(session: Session, event: Workbench.Event.Unstamped) {
        this.realtime.emitEvent<Workbench.Event>({
            ...event,
            channel:     Workbench.Event.getChannel(session.workflowId),
            workflowId:  session.workflowId,
            executionId: session.executionId,
        });
    }




    private async abandon(session: Session) {
        await session.trx.rollback().execute().catch(() => {});
        this.forget(session);
    }




    private forget(session: Session) {
        if (this.sessions.get(session.workflowId) !== session)
            return;

        this.sessions.delete(session.workflowId);
        session.unsubscribe();

        this.emit(session, { type: 'lock:released' });
    }
}
