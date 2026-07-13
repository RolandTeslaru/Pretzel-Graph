import { createServiceClient } from "@/utils/supabase";
import { Injectable } from "@nestjs/common";
import { Auth, Chat, Execution, SystemError, Workflow } from "@pretzel-graph/shared/domain";


const OWNERSHIP_CACHE_TTL_MS = 5 * 60_000   // 5 min — ownership rarely changes in a single-owner model
const OWNERSHIP_CACHE_MAX = 10_000

@Injectable()
export class PermissionService {

    private readonly serviceSupabase = createServiceClient();

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

        const { data, error } = await this.serviceSupabase
            .from('workflows')
            .select('user_id')
            .eq('id', workflowId)
            .maybeSingle();

        if (error || !data?.user_id)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Workflow not found');

        const ownerId = data.user_id as Auth.User.Id;
        this.cacheOwner(workflowId, ownerId);
        return ownerId;
    }


    public async loadExecutionOwner(
        executionId: Execution.Id
    ): Promise<Auth.User.Id | null> {
        const cached = this.getCachedOwner(executionId);
        if (cached)
            return cached;

        const { data } = await this.serviceSupabase
            .from('executions')
            .select('user_id')
            .eq('id', executionId)
            .maybeSingle();

        if (!data?.user_id)
            return null;   // never cache the miss — preemptive subscribe relies on re-checking

        const ownerId = data.user_id as Auth.User.Id;
        this.cacheOwner(executionId, ownerId);
        return ownerId;
    }


    public async loadChatOwner(
        chatId: Chat.Id
    ): Promise<Auth.User.Id | null> {
        const cached = this.getCachedOwner(chatId);
        if (cached)
            return cached;

        const { data } = await this.serviceSupabase
            .from('chats')
            .select('user_id')
            .eq('id', chatId)
            .maybeSingle();

        if (!data?.user_id)
            return null;   // never cache the miss

        const ownerId = data.user_id as Auth.User.Id;
        this.cacheOwner(chatId, ownerId);
        return ownerId;
    }


    public async assertUserAdmin(
        userId: Auth.User.Id
    ) {
        const { data, error } = await this.serviceSupabase
            .from('users')
            .select('is_admin')
            .eq('id', userId)
            .single();

        if (error || !data?.is_admin)
            throw new SystemError(SystemError.Code.INFRA_UNKNOWN, 'Admin access required');
    }
}
