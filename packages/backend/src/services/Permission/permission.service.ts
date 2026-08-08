import { DB } from '@/db';
import { Injectable } from "@nestjs/common";
import { Auth, Chat, Execution, SystemError, Workflow } from "@pretzel-graph/shared/domain";


const OWNERSHIP_CACHE_TTL_MS = 5 * 60_000   // 5 min — ownership rarely changes in a single-owner model
const OWNERSHIP_CACHE_MAX = 10_000

@Injectable()
export class PermissionService {

    private ownershipCache = new Map<Workflow.Id | Chat.Id | Execution.Id, { ownerId: Auth.User.Id, expiresAt: number }>();

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

    public async assertExecutionChat(
        executionId: Execution.Id,
        chatId:      Chat.Id,
    ) {
        const requesterId = await this.loadExecutionOwner(executionId);

        if (!requesterId)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Execution not found');

        return this.assertChat(chatId, requesterId);
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
        const cached = this.getCachedOwner(executionId);
        if (cached)
            return cached;

        const row = await DB.asService('load execution owner', (db) =>
            db
                .selectFrom('executions')
                .select('user_id')
                .where('id', '=', executionId)
                .executeTakeFirst(),
        );
        if (!row)
            return null;   // never cache the miss — preemptive subscribe relies on re-checking

        const ownerId = row.user_id;
        this.cacheOwner(executionId, ownerId);
        return ownerId;
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
