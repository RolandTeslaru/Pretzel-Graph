import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { Auth, Execution, Workflow } from '@pretzel-graph/shared/domain';
import { SystemError } from '@pretzel-graph/shared/domain/SystemError';
import { withSupabaseAssert } from '@pretzel-graph/shared/errors/supabase';

@Injectable()
export class ExecutionDatabase {
    public readonly create = withSupabaseAssert('execution.create', async (
        supabase: SupabaseClient,
        props: {
            workflowId: Workflow.Id,
            userId: Auth.User.Id,
            igniter: Execution.Igniter,
            session: Execution.Session,
            executionId?: Execution.Id,
        }
    ) => {
        const executionId = props.executionId ?? crypto.randomUUID() as Execution.Id;
        await supabase
            .from('executions')
            .insert({
                id: executionId,
                workflow_id: props.workflowId,
                user_id: props.userId,
                igniter: props.igniter,
                status: 'pending',
                duration: 0,
                session: props.session,
                created_at: new Date(),
                updated_at: new Date(),
            })
            .throwOnError();
        return executionId;
    });

    public readonly update = withSupabaseAssert('execution.update', async (
        supabase: SupabaseClient,
        props: {
            executionId: Execution.Id,
            status?: Execution.Status,
            error?: string,
            session?: Execution.Session.Update
        }
    ) => {
        await supabase
            .from('executions')
            .update({
                ...(props.status !== undefined && { status: props.status }),
                ...(props.error !== undefined && { error: props.error }),
                ...(props.session !== undefined && { session: props.session }),
                updated_at: new Date(),
            })
            .eq('id', props.executionId)
            .throwOnError();
    });

    public readonly getStatus = withSupabaseAssert('execution.getStatus', async (
        supabase: SupabaseClient,
        executionId: Execution.Id
    ): Promise<Execution.Status> => {
        const { data, error } = await supabase
            .from('executions')
            .select('status')
            .eq('id', executionId)
            .single()
            .throwOnError();

        if (error)
            throw error;

        return data?.status ?? null;
    });

    public readonly get = withSupabaseAssert('execution.get', async (
        supabase: SupabaseClient,
        executionId: Execution.Id
    ): Promise<Execution> => {
        const { data, error } = await supabase
            .from('executions')
            .select('id, workflow_id, igniter, status, duration, error, session, created_at, updated_at')
            .eq('id', executionId)
            .single()
            .throwOnError();

        if (error || !data)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'Execution not found');

        return data as Execution;
    });

    public readonly getActivePublishedWorkflowData = withSupabaseAssert('execution.sdk.getActivePublishedWorkflowData', async (
        supabase: SupabaseClient,
        workflowId: Workflow.Id
    ): Promise<Workflow.Data> => {
        const { data: row, error } = await supabase
            .from('version_control')
            .select('workflow_data')
            .eq('workflow_id', workflowId)
            .eq('is_active', true)
            .single()
            .throwOnError();

        if (error || !row)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'No active published version found for this workflow');

        return Workflow.Data.Schema.parse(row.workflow_data);
    });

    public readonly listActiveIds = withSupabaseAssert('execution.listActiveIds', async (
        supabase: SupabaseClient
    ): Promise<Execution.Id[]> => {
        const { data, error } = await supabase
            .from('executions')
            .select('id')
            .in('status', ['pending', 'running']);

        if (error) throw new SystemError(SystemError.Code.INFRA_DATABASE_ERROR, error.message);

        return (data ?? []).map(row => row.id as Execution.Id);
    });

    public readonly terminateMany = withSupabaseAssert('execution.terminateMany', async (
        supabase: SupabaseClient,
        executionIds: Execution.Id[],
        error: string
    ) => {
        if (executionIds.length === 0) return;

        await supabase
            .from('executions')
            .update({ status: 'terminated', error, updated_at: new Date() })
            .in('id', executionIds)
            .throwOnError();
    });

    public readonly meta = {
        get: withSupabaseAssert('execution.meta.get', async (
            supabase: SupabaseClient,
            executionId: Execution.Id
        ): Promise<Execution.Meta> => {
            const { data, error } = await supabase
                .from('executions')
                .select('id, workflow_id, igniter, status, duration, error, created_at, updated_at')
                .eq('id', executionId)
                .single()
                .throwOnError();

            if (error || !data)
                throw new SystemError(SystemError.Code.NOT_FOUND, 'Execution not found');
            return data as Execution.Meta;
        }),

        list: withSupabaseAssert('execution.meta.list', async (
            supabase: SupabaseClient,
            workflowId: Workflow.Id
        ): Promise<Execution.Meta[]> => {
            const { data, error } = await supabase
                .from('executions')
                .select('id, workflow_id, igniter, status, duration, error, created_at, updated_at')
                .eq('workflow_id', workflowId)
                .order('created_at', { ascending: false })
                .throwOnError();

            if (error) throw new SystemError(SystemError.Code.INFRA_DATABASE_ERROR, error);
            return data as Execution.Meta[] ?? [];
        }),

        listActive: withSupabaseAssert('execution.meta.listActive', async (
            supabase: SupabaseClient,
        ): Promise<Execution.Meta[]> => {
            const { data, error } = await supabase
                .from('executions')
                .select('id, workflow_id, igniter, status, duration, error, created_at, updated_at')
                .in('status', ['pending', 'running'])
                .order('created_at', { ascending: false })
                .throwOnError();

            if (error) throw new SystemError(SystemError.Code.INFRA_DATABASE_ERROR, error);
            return data as Execution.Meta[] ?? [];
        }),
    };
}
