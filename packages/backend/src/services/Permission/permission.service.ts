import { DB } from '@/db';
import { Injectable } from "@nestjs/common";
import { Auth, Chat, Execution, SystemError, Workflow } from "@pretzel-graph/shared/domain";
import { Principal } from "@/domain/Principal";


const OWNERSHIP_CACHE_TTL_MS = 5 * 60_000   // 5 min — ownership rarely changes in a single-owner model
const OWNERSHIP_CACHE_MAX = 10_000

@Injectable()
export class PermissionService {

    private ownershipCache = new Map<Workflow.Id | Chat.Id | Execution.Id, { ownerId: Auth.User.Id, expiresAt: number }>();

    private executionContextCache = new Map<Execution.Id, { ownerId: Auth.User.Id, workflowId: Workflow.Id, igniter: Execution.Igniter, expiresAt: number }>();

    // Cache the fact (resource → owner), never the miss. Compare against the requester live.
    private cacheOwner(id: Workflow.Id | Chat.Id | Execution.Id, ownerId: Auth.User.Id) {
        if (this.ownershipCache.size >= OWNERSHIP_CACHE_MAX)
            this.pruneExpired();
        
        this.ownershipCache.set(id, { 
            ownerId, 
            expiresAt: Date.now() + OWNERSHIP_CACHE_TTL_MS 
        });
    }

    private getCachedOwner(id: Workflow.Id | Chat.Id | Execution.Id): Auth.User.Id | undefined {
        const hit = this.ownershipCache.get(id);
        if (!hit)
            return undefined;

        if (hit.expiresAt <= Date.now()) {
            this.ownershipCache.delete(id);
            return undefined;
        }

        return hit.ownerId;
    }

    private pruneExpired() {
        const now = Date.now();

        for (const [key, entry] of this.ownershipCache)
            if (entry.expiresAt <= now)
                this.ownershipCache.delete(key);

        for (const [key, entry] of this.executionContextCache)
            if (entry.expiresAt <= now)
                this.executionContextCache.delete(key);
    }


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

        const cached = this.getCachedOwner(workflowId);
        if (cached)
            return cached;

        const row = await DB.asService('load workflow owner', (db) =>
            db
                .selectFrom('workflows')
                .select('user_id')
                .where('id', '=', workflowId)
                .executeTakeFirst(),
        );
        if (!row)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Workflow not found');

        const ownerId = row.user_id;
        this.cacheOwner(workflowId, ownerId);
        return ownerId;
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
        const cached = this.executionContextCache.get(executionId);
        if (cached && cached.expiresAt > Date.now())
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

        this.executionContextCache.set(executionId, {
            ...context,
            expiresAt: Date.now() + OWNERSHIP_CACHE_TTL_MS,
        });
        this.cacheOwner(executionId, context.ownerId);

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


    public async loadChatOwner(
        chatId: Chat.Id
    ): Promise<Auth.User.Id | null> {
        const cached = this.getCachedOwner(chatId);
        if (cached)
            return cached;

        const row = await DB.asService('load chat owner', (db) =>
            db
                .selectFrom('chats')
                .select('user_id')
                .where('id', '=', chatId)
                .executeTakeFirst(),
        );
        if (!row)
            return null;   // never cache the miss

        const ownerId = row.user_id;
        this.cacheOwner(chatId, ownerId);
        return ownerId;
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
