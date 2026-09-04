import type { HTTP } from "@pretzel-graph/node-sdk";
import { Workbench, type Foundations, type Workflow } from "@pretzel-graph/shared/domain";

import Session = Workbench.API.Session;

const HEARTBEAT_MS = 20_000;

const isGone = (error: unknown) => (error as { response?: { status?: number } })?.response?.status === 404;

/**
 * One workflow as something to read and edit from inside a run, over the run's internal API.
 *
 * Reads never hold the workflow: inside a transaction they see its document, outside one a
 * snapshot that may see a write in progress. Writes need a transaction, which the backend
 * enforces; while one is open the row is locked, the document lives in the session, and this
 * keeps it alive until commit or abort.
 */
export class WorkbenchClient {

    #heartbeat: NodeJS.Timeout | null = null;
    #opening:   Promise<void> | null  = null;

    constructor(
        private readonly http:       HTTP.Client,
        private readonly workflowId: Workflow.Id,
    ) {}

    public readonly workflow = {
        get:        ()                                            => Session.Workflow.get(this.http.raw, this.workflowId),
        queryNodes: (request: Session.Workflow.QueryNodes.Request) => Session.Workflow.queryNodes(this.http.raw, this.workflowId, request),
        queryEdges: (request: Session.Workflow.QueryEdges.Request) => Session.Workflow.queryEdges(this.http.raw, this.workflowId, request),
        layout:     ()                                            => Session.Workflow.layout(this.http.raw, this.workflowId),
        getMeta:    ()                                            => Session.Workflow.getMeta(this.http.raw, this.workflowId),
    };

    public readonly node = {
        get:    (nodeId: Workflow.Node.Id)             => Session.Node.get(this.http.raw, this.workflowId, nodeId),
        create: (request: Session.Node.Create.Request) => Session.Node.create(this.http.raw, this.workflowId, request),
        delete: (nodeId: Workflow.Node.Id)             => Session.Node.remove(this.http.raw, this.workflowId, { nodeId }),
        move:   (nodeId: Workflow.Node.Id, position: { x: number, y: number }) => Session.Node.move(this.http.raw, this.workflowId, { nodeId, position }),
    };

    public readonly edge = {
        create: (request: Session.Edge.Create.Request) => Session.Edge.create(this.http.raw, this.workflowId, request),
        delete: (edgeId: Workflow.Edge.Id)             => Session.Edge.remove(this.http.raw, this.workflowId, { edgeId }),
    };

    public readonly field = {
        get: (nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id)                 => Session.Field.get(this.http.raw, this.workflowId, nodeId, fieldId),
        set: (nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id, value: unknown) => Session.Field.set(this.http.raw, this.workflowId, { nodeId, fieldId, value }),
    };

    public readonly globalField = {
        list:   ()                                                                  => Session.GlobalField.list(this.http.raw, this.workflowId),
        add:    (request: Session.GlobalField.Add.Request)                          => Session.GlobalField.add(this.http.raw, this.workflowId, request),
        update: (fieldId: Foundations.Field.Id, patch: Session.GlobalField.Update.Request["patch"]) => Session.GlobalField.update(this.http.raw, this.workflowId, { fieldId, patch }),
        remove: (fieldId: Foundations.Field.Id)                                     => Session.GlobalField.remove(this.http.raw, this.workflowId, { fieldId }),
    };

    /** Applied in order on the backend; stops at the first failure. */
    public batch(operations: Session.Operation[]) {
        return Session.Batch.apply(this.http.raw, this.workflowId, { operations });
    }

    public get inTransaction(): boolean {
        return this.#heartbeat !== null;
    }

    /** Lock and load. Refused while anyone — this run included — holds the workflow. */
    public async beginTransaction(): Promise<void> {
        if (this.inTransaction)
            throw new Error(`A transaction on ${this.workflowId} is already open`);

        await Session.beginTransaction(this.http.raw, this.workflowId);

        this.#heartbeat = setInterval(() => {
            void Session.heartbeat(this.http.raw, this.workflowId).catch(error => {
                // The backend closed it without us — the run ended, or the hold was reaped.
                if (isGone(error))
                    void this.#finish(async () => {});
            });
        }, HEARTBEAT_MS);
        this.#heartbeat.unref?.();
    }

    /** Opens lazily; concurrent callers share the one begin. */
    public ensureTransaction(): Promise<void> {
        if (this.inTransaction)
            return Promise.resolve();

        this.#opening ??= this.beginTransaction().finally(() => { this.#opening = null });

        return this.#opening;
    }

    public async commitTransaction(): Promise<void> {
        if (!this.inTransaction)
            throw new Error(`No open transaction on ${this.workflowId}`);

        await this.#finish(() => Session.commitTransaction(this.http.raw, this.workflowId));
    }

    public async abortTransaction(): Promise<void> {
        if (!this.inTransaction)
            return;

        await this.#finish(() => Session.abortTransaction(this.http.raw, this.workflowId));
    }

    /** One edit, one short hold. */
    public async write<T>(fn: () => Promise<T>): Promise<T> {
        await this.beginTransaction();

        try {
            const result = await fn();
            await this.commitTransaction();
            return result;
        }
        catch (error) {
            await this.abortTransaction();
            throw error;
        }
    }

    async #finish(send: () => Promise<unknown>) {
        if (this.#heartbeat)
            clearInterval(this.#heartbeat);

        this.#heartbeat = null;
        await send();
    }
}
