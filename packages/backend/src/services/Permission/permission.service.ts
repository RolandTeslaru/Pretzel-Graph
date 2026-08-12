import { DB } from '@/db';
import { Injectable } from "@nestjs/common";
import { Auth, Chat, Execution, SystemError, Workflow } from "@pretzel-graph/shared/domain";
import { Principal } from "@/domain/Principal";
import { TtlCache } from "./ttl-cache";


const MINUTE = 60_000
const HOUR   = 60 * MINUTE

/**
 * Ownership is immutable in a single-owner model, so a TTL is not guarding against the owner
 * changing — it is a backstop for a row that disappeared without `invalidate` being called
 * (an RLS-direct delete from the client, say). Deletes routed through the backend evict
 * explicitly, so these can be generous.
 *
 * They differ by how long the resource itself stays interesting. A workflow is edited and
 * run over days; an execution or a chat is addressed heavily for a few minutes and then
 * effectively never again, so a long TTL there buys nothing and holds memory.
 */
const WORKFLOW_TTL_MS  = 24 * HOUR
const EXECUTION_TTL_MS = 20 * MINUTE
const CHAT_TTL_MS      = 20 * MINUTE

const WORKFLOW_CACHE_MAX  = 5_000
const EXECUTION_CACHE_MAX = 5_000   // lower: each entry carries an igniter, whose size is whatever ignited the run
const CHAT_CACHE_MAX      = 10_000

type WorkflowScope  = { ownerId: Auth.User.Id }
type ChatScope      = { ownerId: Auth.User.Id, workflow_id: Workflow.Id }
type ExecutionScope = { ownerId: Auth.User.Id, workflowId: Workflow.Id, igniter: Execution.Igniter }

@Injectable()
export class PermissionService {

    // One map per kind. Cache the fact (resource → owner), never the miss: a preemptive
    // subscribe asks about an execution before its row exists, and must keep re-checking.
    readonly #cache = {
        workflows:  new TtlCache<Workflow.Id,  WorkflowScope> (WORKFLOW_TTL_MS,  WORKFLOW_CACHE_MAX),
        chats:      new TtlCache<Chat.Id,      ChatScope>     (CHAT_TTL_MS,      CHAT_CACHE_MAX),
        executions: new TtlCache<Execution.Id, ExecutionScope>(EXECUTION_TTL_MS, EXECUTION_CACHE_MAX),
    };

    /**
     * Drop a resource the backend just deleted. Call it after the delete commits — the cached
     * owner is otherwise correct until the TTL, and would keep authorizing routes for a row
     * that no longer exists.
     *
     * Keyed by kind rather than taking a bare id: the three id types are all branded uuids,
     * so a single entry point cannot tell which map a caller meant.
     */
    public readonly invalidate = {
        workflow:  (id: Workflow.Id)  => this.#cache.workflows.delete(id),
        chat:      (id: Chat.Id)      => this.#cache.chats.delete(id),
        execution: (id: Execution.Id) => this.#cache.executions.delete(id),
    };


    public async assertWorkflow(
        workflowId: Workflow.Id,
        requesterId: Auth.User.Id
    ) {
        const ownerId = await this.loadWorkflowOwner(workflowId);

        if(ownerId !== requesterId)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Workflow not found');

        return ownerId
    }




    public async assertExecution(
        executionId: Execution.Id,
        requesterId: Auth.User.Id
    ) {
        const ownerId = await this.loadExecutionOwner(executionId);

        if(ownerId !== requesterId)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Execution not found');

        return ownerId
    }



    public async assertChat(
        chatId:      Chat.Id,
        requesterId: Auth.User.Id
    ) {
        const ownerId = await this.loadChatOwner(chatId);

        if(ownerId !== requesterId)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Chat not found');

        return ownerId
    }

    /**
     * RLS already confines a delegated write to the owner's own chats, so this is not
     * what makes it safe — it makes failures uniform. Without it a foreign chatId reads
     * back as an empty list rather than an error, and the error kind would vary by
     * whether the chat exists, which tells the workflow author something they should
     * not learn.
     */
    public async assertDelegateChat(
        delegate: Principal.Delegate,
        chatId:   Chat.Id,
    ) {
        return this.assertChat(chatId, delegate.actingAsUserId);
    }




    /**
     * Scopes a delegate to its *own* workflow, not merely to one its owner happens to
     * have. A running execution has exactly one workflow; anything it names that isn't
     * that workflow is a claim it has no basis to make.
     */
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




    public async loadWorkflowOwner(
        workflowId: Workflow.Id
    ): Promise<Auth.User.Id> {

        const cached = this.#cache.workflows.get(workflowId);
        if (cached)
            return cached.ownerId;

        const row = await DB.asService('load workflow owner', (db) =>
            db
                .selectFrom('workflows')
                .select('user_id')
                .where('id', '=', workflowId)
                .executeTakeFirst(),
        );
        if (!row)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Workflow not found');

        this.#cache.workflows.set(workflowId, { ownerId: row.user_id });
        return row.user_id;
    }


    /**
     * Owner as a scope payload. Distinct from loadWorkflowOwner, which throws on a miss —
     * ScopedGuard needs the miss and the ownership mismatch to fail identically.
     */
    public async loadWorkflowScope(
        workflowId: Workflow.Id
    ): Promise<{ ownerId: Auth.User.Id } | null> {

        const cached = this.#cache.workflows.get(workflowId);
        if (cached)
            return cached;

        const row = await DB.asService('load workflow scope', (db) =>
            db
                .selectFrom('workflows')
                .select('user_id')
                .where('id', '=', workflowId)
                .executeTakeFirst(),
        );
        if (!row)
            return null;

        const scope = { ownerId: row.user_id };
        this.#cache.workflows.set(workflowId, scope);
        return scope;
    }


    public async loadExecutionOwner(
        executionId: Execution.Id
    ): Promise<Auth.User.Id | null> {
        const context = await this.loadExecutionContext(executionId);
        return context?.ownerId ?? null;
    }


    /**
     * Owner + workflow + igniter in one read — the facts needed to mint a delegated
     * principal and scope it to its own workflow. All immutable after insert, so
     * caching them together is safe.
     */
    public async loadExecutionContext(
        executionId: Execution.Id
    ): Promise<{ ownerId: Auth.User.Id, workflowId: Workflow.Id, igniter: Execution.Igniter } | null> {
        const cached = this.#cache.executions.get(executionId);
        if (cached)
            return cached;

        const row = await DB.asService('load execution context', (db) =>
            db
                .selectFrom('executions')
                .select(['user_id', 'workflow_id', 'igniter'])
                .where('id', '=', executionId)
                .executeTakeFirst(),
        );
        if (!row)
            return null;   // never cache the miss — preemptive subscribe relies on re-checking

        const context = { ownerId: row.user_id, workflowId: row.workflow_id, igniter: row.igniter };

        this.#cache.executions.set(executionId, context);

        return context;
    }


    /**
     * Builds the principal a running execution acts under. Derived here rather than
     * accepted from the worker, which knows only its own execution id — so a leaked
     * runtime-node token can act on existing executions as their real owners, but
     * cannot name a user.
     */
    public async resolveDelegate(
        executionId: Execution.Id
    ): Promise<Principal.Delegate> {
        const context = await this.loadExecutionContext(executionId);

        if (!context)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Execution not found');

        return {
            type: 'delegate',
            actingAsUserId: context.ownerId,
            executionId,
            via: context.igniter.variant,
        };
    }


    /**
     * Owner plus the workflow the chat hangs off — the second field is what lets a route
     * naming both ids verify the chat actually belongs to that workflow.
     */
    public async loadChatScope(
        chatId: Chat.Id
    ): Promise<ChatScope | null> {
        const cached = this.#cache.chats.get(chatId);
        if (cached)
            return cached;

        const row = await DB.asService('load chat scope', (db) =>
            db
                .selectFrom('chats')
                .select(['user_id', 'workflow_id'])
                .where('id', '=', chatId)
                .executeTakeFirst(),
        );
        if (!row)
            return null;

        const scope = { ownerId: row.user_id, workflow_id: row.workflow_id };
        this.#cache.chats.set(chatId, scope);
        return scope;
    }


    public async loadChatOwner(
        chatId: Chat.Id
    ): Promise<Auth.User.Id | null> {
        const scope = await this.loadChatScope(chatId);
        return scope?.ownerId ?? null;
    }


    public async assertUserAdmin(
        userId: Auth.User.Id
    ) {
        const row = await DB.asService('check user admin', (db) =>
            db
                .selectFrom('users')
                .select('is_admin')
                .where('id', '=', userId)
                .executeTakeFirst(),
        );
        if (!row?.is_admin)
            throw new SystemError(SystemError.Code.INFRA_UNKNOWN, 'Admin access required');
    }
}
