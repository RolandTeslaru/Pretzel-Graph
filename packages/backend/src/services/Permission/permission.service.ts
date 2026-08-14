import { DB } from '@/db';
import { Injectable } from "@nestjs/common";
import { Auth, Chat, Execution, SystemError, Workflow } from "@pretzel-graph/shared/domain";
import { Principal } from "@/domain/Principal";
import { TtlCache } from "./ttl-cache";


const MINUTE = 60_000
const HOUR   = 60 * MINUTE

const WORKFLOW_TTL_MS  = 24 * HOUR
const EXECUTION_TTL_MS = 20 * MINUTE
const CHAT_TTL_MS      = 20 * MINUTE

const WORKFLOW_CACHE_MAX  = 5_000
const EXECUTION_CACHE_MAX = 5_000   // lower: each entry carries an igniter
const CHAT_CACHE_MAX      = 10_000

type WorkflowScope  = { exists: true }
type ChatScope      = { workflow_id: Workflow.Id }
type ExecutionScope = { createdBy: Auth.User.Id | null, workflowId: Workflow.Id, igniter: Execution.Igniter }

// Only resolveDelegate, assertUserAdmin and assertDelegateWorkflow have callers.
@Injectable()
export class PermissionService {

    // Never cache a miss — a row may not exist yet.
    readonly #cache = {
        workflows:  new TtlCache<Workflow.Id,  WorkflowScope> (WORKFLOW_TTL_MS,  WORKFLOW_CACHE_MAX),
        chats:      new TtlCache<Chat.Id,      ChatScope>     (CHAT_TTL_MS,      CHAT_CACHE_MAX),
        executions: new TtlCache<Execution.Id, ExecutionScope>(EXECUTION_TTL_MS, EXECUTION_CACHE_MAX),
    };

    /** Call after a delete commits. Keyed by kind — the id types are all branded uuids. */
    public readonly invalidate = {
        workflow:  (id: Workflow.Id)  => this.#cache.workflows.delete(id),
        chat:      (id: Chat.Id)      => this.#cache.chats.delete(id),
        execution: (id: Execution.Id) => this.#cache.executions.delete(id),
    };


    /** Missing and unreachable rows fail identically. */
    public async assertWorkflow(
        workflowId: Workflow.Id,
    ) {
        if (!await this.loadWorkflowScope(workflowId))
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Workflow not found');
    }




    public async assertExecution(
        executionId: Execution.Id,
    ) {
        if (!await this.loadExecutionContext(executionId))
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Execution not found');
    }



    public async assertChat(
        chatId: Chat.Id,
    ) {
        if (!await this.loadChatScope(chatId))
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Chat not found');
    }

    /** Uniform failure: a missing chat must not read back as an empty list. */
    public async assertDelegateChat(
        delegate: Principal.Delegate,
        chatId:   Chat.Id,
    ) {
        void delegate;
        return this.assertChat(chatId);
    }




    /** An execution may only name its own workflow. */
    public async assertDelegateWorkflow(
        delegate:   Principal.Delegate,
        workflowId: Workflow.Id,
    ) {
        const context = await this.loadExecutionContext(delegate.executionId);

        if (!context)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Execution not found');

        if (context.workflowId !== workflowId)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Workflow not found');

        return context.workflowId;
    }




    /** Null when there is no such workflow. */
    public async loadWorkflowScope(
        workflowId: Workflow.Id
    ): Promise<WorkflowScope | null> {

        const cached = this.#cache.workflows.get(workflowId);
        if (cached)
            return cached;

        const row = await DB.asService('load workflow scope', (db) =>
            db
                .selectFrom('workflows')
                .select('id')
                .where('id', '=', workflowId)
                .executeTakeFirst(),
        );
        if (!row)
            return null;

        const scope = { exists: true } as const;
        this.#cache.workflows.set(workflowId, scope);
        return scope;
    }


    /** One read for the fields a delegate needs. All immutable after insert. */
    public async loadExecutionContext(
        executionId: Execution.Id
    ): Promise<ExecutionScope | null> {
        const cached = this.#cache.executions.get(executionId);
        if (cached)
            return cached;

        const row = await DB.asService('load execution context', (db) =>
            db
                .selectFrom('executions')
                .select(['created_by', 'workflow_id', 'igniter'])
                .where('id', '=', executionId)
                .executeTakeFirst(),
        );
        if (!row)
            return null;

        const context = { createdBy: row.created_by, workflowId: row.workflow_id, igniter: row.igniter };

        this.#cache.executions.set(executionId, context);

        return context;
    }


    /** Builds the delegate principal from the execution row, never from the caller. */
    public async resolveDelegate(
        executionId: Execution.Id
    ): Promise<Principal.Delegate> {
        const context = await this.loadExecutionContext(executionId);

        if (!context)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Execution not found');

        return {
            type: 'delegate',
            createdBy: context.createdBy,
            executionId,
            via: context.igniter.variant,
        };
    }


    /** The workflow the chat hangs off. */
    public async loadChatScope(
        chatId: Chat.Id
    ): Promise<ChatScope | null> {
        const cached = this.#cache.chats.get(chatId);
        if (cached)
            return cached;

        const row = await DB.asService('load chat scope', (db) =>
            db
                .selectFrom('chats')
                .select('workflow_id')
                .where('id', '=', chatId)
                .executeTakeFirst(),
        );
        if (!row)
            return null;

        const scope = { workflow_id: row.workflow_id };
        this.#cache.chats.set(chatId, scope);
        return scope;
    }


    public async assertUserAdmin(
        userId: Auth.User.Id
    ) {
        const row = await DB.asService('check member role', (db) =>
            db
                .selectFrom('members')
                .select('role')
                .where('user_id', '=', userId)
                .executeTakeFirst(),
        );
        if (row?.role !== 'owner' && row?.role !== 'admin')
            throw new SystemError(SystemError.Code.INFRA_UNKNOWN, 'Admin access required');
    }
}
