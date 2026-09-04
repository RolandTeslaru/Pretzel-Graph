import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { sql } from 'kysely';
import { Execution, Foundations, SystemError, Workbench, Workflow } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';
import { Principal } from '@/domain/Principal';
import { RealtimeService } from '../Realtime/realtime.service';
import { ShelfService } from '../Shelf/shelf.service';
import { WorkbenchRepository } from './workbench.repository';

// A worker-side hold on a workflow. The row is locked by one transaction kept open from begin
// to commit, and the document being edited lives here for that long: each operation applies
// one edit to it and announces the edit on the workflow's channel; commit writes it back whole.
// Postgres is the lock: a dead connection releases it, and the idle timeout below reaps a
// caller that stops heartbeating.
//
// One session per workflow at a time — the row lock guarantees it — recorded with the execution
// that holds it, so only that execution may edit, heartbeat, commit, or abort it. A second begin
// is refused whoever asks, before Postgres has to block on it.

type Session = {
    trx:         DB.HeldDelegateTransaction,
    workflowId:  Workflow.Id,
    executionId: Execution.Id,
    document:    Workbench.Document,
    unsubscribe: () => void,
};

type Operation = Workbench.API.Session.Operation;

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




    /** The session's own document while this execution holds the workflow; a snapshot otherwise. */
    public async read(delegate: Principal.Delegate, workflowId: Workflow.Id): Promise<Workbench.Document> {
        const session = this.sessions.get(workflowId);

        if (session && session.executionId === delegate.executionId)
            return session.document;

        const workflow = await this.repository.workflow.get(delegate, workflowId);

        return this.createDocument(workflow);
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

            const session: Session = {
                trx,
                workflowId,
                executionId: delegate.executionId,
                document:    await this.createDocument(DB.Workflow.toDomain(row)),
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

            this.emit(session, { type: 'lock:acquired' });

            return { workflowId };
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




    /** One edit on the held document, announced as it lands. */
    public async apply(delegate: Principal.Delegate, workflowId: Workflow.Id, operation: Operation): Promise<unknown> {
        const session = this.require(delegate, workflowId);
        const d = session.document;

        // The edit never reaches Postgres, so the hold looks idle to it; every operation counts
        // as a heartbeat.
        await this.heartbeat(delegate, workflowId);

        switch (operation.op) {
            case 'node.create': {
                const blueprint = await this.resolveBlueprint(operation.blueprintId);
                const result    = Workbench.Operations.node.create(d, blueprint, operation.position, operation.staticValues);

                this.emit(session, {
                    type:         'node:created',
                    node:         d.data.nodes[result.nodeId],
                    position:     d.data.ui.layout[result.nodeId],
                    staticValues: d.data.staticValues[result.nodeId] ?? {},
                });

                return result;
            }

            case 'node.delete': {
                const result = Workbench.Operations.node.delete(d, operation.nodeId);

                this.emit(session, { type: 'node:deleted', nodeId: result.nodeId });

                return result;
            }

            case 'edge.create': {
                const result = Workbench.Operations.edge.create(d, operation);

                this.emit(session, { type: 'edge:created', edgeId: result.edgeId });

                return result;
            }

            case 'edge.delete': {
                const result = Workbench.Operations.edge.delete(d, operation.edgeId);

                this.emit(session, { type: 'edge:deleted', edgeId: result.edgeId });

                return result;
            }

            case 'field.set': {
                const result = Workbench.Operations.field.set(d, operation.nodeId, operation.fieldId, operation.value);

                this.emit(session, {
                    type:    'field:set',
                    nodeId:  result.nodeId,
                    fieldId: result.fieldId,
                    value:   operation.value,
                });

                return result;
            }
        }
    }




    /** In order, stopping at the first failure; what landed before it stays applied. */
    public async applyBatch(delegate: Principal.Delegate, workflowId: Workflow.Id, operations: Operation[]): Promise<Workbench.API.Session.Batch.Response> {
        const results: unknown[] = [];

        for (const [index, operation] of operations.entries()) {
            try {
                results.push(await this.apply(delegate, workflowId, operation));
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);

                throw new SystemError(SystemError.Code.BAD_REQUEST, `Operation ${index} (${operation.op}) failed: ${message}`);
            }
        }

        return { results };
    }




    public async commitTransaction(delegate: Principal.Delegate, workflowId: Workflow.Id): Promise<void> {
        const session = this.require(delegate, workflowId);

        try {
            await session.trx
                .updateTable('workflows')
                .set({ data: session.document.data })
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




    private async createDocument(workflow: Workflow): Promise<Workbench.Document> {
        const { blueprints } = await this.shelfService.collectWorkflowBlueprints(workflow.data);
        const document       = Workbench.Document.create(workflow.id, workflow.data, blueprints);

        Workbench.Document.withCyclesRecompute(d => d.reducers.workflow.validate(d))(document);

        return document;
    }




    private async resolveBlueprint(blueprintId: Foundations.Blueprint.Id): Promise<Foundations.Blueprint> {
        const { blueprints } = await this.shelfService.getBatchBlueprints({ blueprintIds: [blueprintId] });
        const blueprint      = blueprints[blueprintId];

        if (!blueprint)
            throw new SystemError(SystemError.Code.NOT_FOUND, `Blueprint ${blueprintId} not found`);

        return blueprint;
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
