import type { HTTP } from "@pretzel-graph/node-sdk";
import { Workbench, Workflow } from "@pretzel-graph/shared/domain";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";

const HEARTBEAT_MS = 20_000;

/**
 * One hold on one workflow. The backend keeps the row locked in an open transaction for as long
 * as this exists; the document here is the copy being edited, and commit sends it back whole.
 */
export class WorkbenchTransaction {
    public readonly document: Workbench.Document;

    #closed = false;
    readonly #heartbeat: NodeJS.Timeout;
    private workflowId: Workflow.Id

    constructor(
        private readonly http:       HTTP.Client,
        workflow: Workflow,
        blueprints: Record<Blueprint.Id, Blueprint>
    ) {
        this.workflowId = workflow.id
        this.document = Workbench.Document.create(workflow.id, workflow.data, blueprints);

        this.#heartbeat = setInterval(() => {
            void Workbench.API.Session.heartbeat(this.http.raw, workflow.id).catch(() => {});
        }, HEARTBEAT_MS);
        this.#heartbeat.unref?.();
    }

    public async commitTransaction(): Promise<void> {
        if (this.#closed)
            throw new Error(`Session on ${this.workflowId} is already closed`);

        await this.#finish(() => Workbench.API.Session.commitTransaction(this.http.raw, this.workflowId, { data: this.document.data }));
    }

    public async abortTransaction(): Promise<void> {
        if (this.#closed)
            return;

        await this.#finish(() => Workbench.API.Session.abortTransaction(this.http.raw, this.workflowId));
    }

    async #finish(send: () => Promise<unknown>) {
        this.#closed = true;
        clearInterval(this.#heartbeat);
        await send();
    }
}


/** One workflow as something to read and edit from inside a run, over the run's internal API. */
export class WorkbenchClient {
    constructor(
        private readonly http:       HTTP.Client,
        private readonly workflowId: Workflow.Id,
    ) {}

    /** A snapshot document. Never locks, so it may see a write in progress. */
    public async read(): Promise<Workbench.Document> {
        const snapshot = await Workbench.API.Session.get(this.http.raw, this.workflowId);

        return Workbench.Document.create(snapshot.workflow.id, snapshot.workflow.data, snapshot.blueprints);
    }

    /** Lock and load. Refused while anyone — this run included — holds the workflow. */
    public async beginTransaction(): Promise<WorkbenchTransaction> {
        const initial = await Workbench.API.Session.beginTransaction(this.http.raw, this.workflowId);

        return new WorkbenchTransaction(this.http, initial.workflow, initial.blueprints);
    }

    /** One edit, one short hold. */
    public async write<T>(fn: (document: Workbench.Document) => T): Promise<T> {
        const transaction = await this.beginTransaction();

        try {
            const result = fn(transaction.document);
            await transaction.commitTransaction();
            return result;
        }
        catch (error) {
            await transaction.abortTransaction();
            throw error;
        }
    }
}
