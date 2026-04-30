import { SupabaseClient } from "@supabase/supabase-js";
import { Auth, Execution, Workflow } from "@pretzel-graph/shared/domain";
import { SystemError } from "@pretzel-graph/shared/domain/SystemError";

export async function assertWorkflowOwnership(
    supabase: SupabaseClient,
    workflowId: Workflow.Id,
    requesterId: Auth.User.Id,
): Promise<Auth.User.Id> {
    const { data, error } = await supabase
        .from('workflows')
        .select('user_id')
        .eq('id', workflowId)
        .maybeSingle();

    if (error || !data || data.user_id !== requesterId)
        throw new SystemError(SystemError.Code.NOT_FOUND, 'Workflow not found');

    return data.user_id as Auth.User.Id;
}

export async function assertExecutionOwnership(
    supabase: SupabaseClient,
    executionId: Execution.Id,
    requesterId: Auth.User.Id,
): Promise<void> {
    const { data, error } = await supabase
        .from('executions')
        .select('user_id')
        .eq('id', executionId)
        .maybeSingle();

    if (error || !data || data.user_id !== requesterId)
        throw new SystemError(SystemError.Code.NOT_FOUND, 'Execution not found');
}

export async function loadWorkflowOwner(
    serviceSupabase: SupabaseClient,
    workflowId: Workflow.Id,
): Promise<Auth.User.Id> {
    const { data, error } = await serviceSupabase
        .from('workflows')
        .select('user_id')
        .eq('id', workflowId)
        .maybeSingle();

    if (error || !data)
        throw new SystemError(SystemError.Code.NOT_FOUND, 'Workflow not found');

    return data.user_id as Auth.User.Id;
}
