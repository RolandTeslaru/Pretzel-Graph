import { createServiceClient } from "@/utils/supabase";
import { Injectable } from "@nestjs/common";
import { Auth, Chat, Execution, SystemError, Workflow } from "@pretzel-graph/shared/domain";
import { SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class PermissionService {

    private readonly serviceSupabase = createServiceClient();




    public async assertWorkflow(
        supabase: SupabaseClient,
        workflowId: Workflow.Id,
        requesterId: Auth.User.Id
    ) {
        const { data, error } = await supabase
            .from('workflows')
            .select('user_id')
            .eq('id', workflowId)
            .maybeSingle();

        if(error)
            throw new SystemError(SystemError.Code.INFRA_DATABASE_ERROR, 'Database error', { detail: error.message });

        if(!data || !data.user_id || data.user_id !== requesterId)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Workflow not found');

        return data.user_id as Auth.User.Id;
    }




    public async assertExecution(
        supabase: SupabaseClient,
        executionId: Execution.Id,
        requesterId: Auth.User.Id
    ) {
        const { data, error } = await supabase
            .from('executions')
            .select('user_id')
            .eq('id', executionId)
            .maybeSingle();

        if(error)
            throw new SystemError(SystemError.Code.INFRA_DATABASE_ERROR, 'Database error', { detail: error.message });

        if(!data || !data.user_id || data.user_id !== requesterId)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Execution not found');
    }



    public async assertChat(
        supabase:    SupabaseClient,
        chatId:      Chat.Id,
        requesterId: Auth.User.Id
    ) {
        const { data, error } = await supabase
            .from('chats')
            .select('user_id')
            .eq('id', chatId)
            .maybeSingle();

        if(error)
            throw new SystemError(SystemError.Code.INFRA_DATABASE_ERROR, 'Database error', { detail: error.message });

        if(!data || !data.user_id || data.user_id !== requesterId)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Chat not found');
    }




    public async loadWorkflowOwner(
        workflowId: Workflow.Id
    ): Promise<Auth.User.Id> {
        const { data, error } = await this.serviceSupabase
            .from('workflows')
            .select('user_id')
            .eq('id', workflowId)
            .maybeSingle();

        if (error || !data)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Workflow not found');

        return data.user_id as Auth.User.Id;
    }


    public async loadExecutionOwner(
        executionId: Execution.Id
    ): Promise<Auth.User.Id | null> {
        const { data } = await this.serviceSupabase
            .from('executions')
            .select('user_id')
            .eq('id', executionId)
            .maybeSingle();

        return data ? data.user_id as Auth.User.Id : null;
    }


    public async loadChatOwner(
        chatId: Chat.Id
    ): Promise<Auth.User.Id | null> {
        const { data } = await this.serviceSupabase
            .from('chats')
            .select('user_id')
            .eq('id', chatId)
            .maybeSingle();

        return data ? data.user_id as Auth.User.Id : null;
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
