import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { sql } from 'kysely';
import { Execution, SystemError, Workbench, Workflow } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { Principal } from '@/domain/Principal';
import { PermissionService } from '../Permission/permission.service';
import { RealtimeService } from '../Realtime/realtime.service';
import { ShelfService } from '../Shelf/shelf.service';

// A worker-side hold on a workflow. The row is locked by one transaction kept open from begin
// to commit; the caller mutates a copy and sends the result back. Postgres is the lock: a dead
// connection releases it, and the idle timeout below reaps a caller that stops heartbeating.
//
// One session per workflow at a time — the row lock guarantees it — recorded with the execution
// that holds it, so only that execution may heartbeat, commit, or abort it. A second begin is
// refused whoever asks, before Postgres has to block on it.

type Session = {
    trx:         DB.HeldDelegateTransaction,
    workflowId:  Workflow.Id,
    executionId: Execution.Id,
    workflow:    Workflow,
    unsubscribe: () => void,
};

const IDLE_TIMEOUT = '60s';

const isLockNotAvailable = (error: unknown) => (error as { code?: string })?.code === '55P03';

@Injectable()
export class WorkbenchSessionService implements OnModuleDestroy {

    private readonly sessions = new Map<Workflow.Id, Session>();

    constructor(
        private readonly realtime:     RealtimeService,
        private readonly shelfService: ShelfService,
    ) {}




    public isLocked(workflowId: Workflow.Id): boolean {
        return this.sessions.has(workflowId);
    }




    public async beginTransaction(delegate: Principal.Delegate, workflowId: Workflow.Id): Promise<Workbench.API.Session.Begin.Response> {

        const existing = this.sessions.get(workflowId);

        if (existing)
            throw new SystemError(SystemError.Code.CONFLICT, `Workflow is held by execution ${existing.executionId}`);

        const trx = await DB.beginHeldDelegate();

        try {
            await sql`set local idle_in_transaction_session_timeout = '60s'`.execute(trx);

            const row = await trx
                .selectFrom('workflows')
                .selectAll()
                .where('id', '=', workflowId)
                .forUpdate()
                .noWait()
                .executeTakeFirst();

            if (!row)
                throw new SystemError(SystemError.Code.NOT_FOUND, 'Workflow not found');

            const session: Session = {
                trx,
                workflowId,
                executionId: delegate.executionId,
                workflow:    DB.Workflow.toDomain(row),
                // The worker announces how its run ended on the execution channel; any terminal
                // state releases whatever the run still holds.
                unsubscribe: this.realtime.subscribe<Execution.Event.Base>(
                    Execution.Event.getChannel(delegate.executionId),
                    event => { 
                        if (Execution.Event.TERMINAL.has(event.type)) 
                            void this.releaseExecution(delegate.executionId); 
                    },
                ),
            };

            this.sessions.set(workflowId, session);

            this.realtime.emitEvent<Workbench.Event.Lock.Acquired>({
                channel:     Workbench.Event.getChannel(workflowId),
                type:        'lock:acquired',
                workflowId,
                executionId: delegate.executionId,
            });

            const { blueprints, repairs } = await this.shelfService.collectWorkflowBlueprints(session.workflow.data);

            return { workflow: { ...session.workflow, locked: true }, blueprints, repairs };
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




    private require(delegate: Principal.Delegate, workflowId: Workflow.Id): Session {
        const session = this.sessions.get(workflowId);

        if (!session || session.executionId !== delegate.executionId)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'No open session for this workflow');

        return session;
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

        this.realtime.emitEvent<Workbench.Event.Lock.Released>({
            channel:     Workbench.Event.getChannel(session.workflowId),
            type:        'lock:released',
            workflowId:  session.workflowId,
            executionId: session.executionId,
        });
    }
}
