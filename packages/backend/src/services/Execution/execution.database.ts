import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { Auth, Chat, Execution, Recording, Workflow } from '@pretzel-graph/shared/domain';
import { withSupabaseAssert } from '@pretzel-graph/shared/errors/supabase';

@Injectable()
export class ExecutionDatabase {
    public readonly create = withSupabaseAssert('execution.create', async (
        supabase: SupabaseClient,
        props: {
            workflowId:   Workflow.Id,
            userId:       Auth.User.Id,
            igniter:      Execution.Igniter,
            session:      Execution.Session,
            executionId?: Execution.Id,
            chatId?:      Chat.Id,
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
                chat_id: props.chatId ?? null,
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
            status?:     Execution.Status,
            error?:      string,
            session?:    Execution.Session.Update
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
        supabase:    SupabaseClient,
        executionId: Execution.Id
    ): Promise<Execution.Status> => {
        const { data } = await supabase
            .from('executions')
            .select<'status', { status: string }>('status')
            .eq('id', executionId)
            .single()
            .throwOnError();

        return Execution.Status.parse(data!.status);
    });

    public readonly get = withSupabaseAssert('execution.get', async (
        supabase:    SupabaseClient,
        executionId: Execution.Id
    ): Promise<Execution> => {
        const { data } = await supabase
            .from('executions')
            .select('id, workflow_id, igniter, status, duration, error, session, chat_id, created_at, updated_at')
            .eq('id', executionId)
            .single()
            .throwOnError();

        return Execution.Schema.parse(data);
    });

    public readonly getActivePublishedWorkflowData = withSupabaseAssert('execution.sdk.getActivePublishedWorkflowData', async (
        supabase:   SupabaseClient,
        workflowId: Workflow.Id
    ): Promise<Workflow.Data> => {
        const { data: row } = await supabase
            .from('version_control')
            .select('workflow_data')
            .eq('workflow_id', workflowId)
            .eq('is_active', true)
            .single()
            .throwOnError();

        return Workflow.Data.Schema.parse(row!.workflow_data);
    });

    public readonly listActiveIds = withSupabaseAssert('execution.listActiveIds', async (
        supabase: SupabaseClient
    ): Promise<Execution.Id[]> => {
        const { data } = await supabase
            .from('executions')
            .select('id')
            .in('status', ['pending', 'running'])
            .throwOnError();

        return (data ?? []).map(row => Execution.Id.parse(row.id));
    });

    public readonly terminateMany = withSupabaseAssert('execution.terminateMany', async (
        supabase:     SupabaseClient,
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

    public readonly recording = {
        upsert: withSupabaseAssert('recording.upsert', async (
            supabase:  SupabaseClient,
            recording: Recording,
            userId:    Auth.User.Id,
        ) => {
            const { workflowDataSnapshot, tracks, units, relations, dataBank } = recording;
            await supabase
                .from('execution_recordings')
                .upsert({
                    id:           recording.id,
                    execution_id: recording.executionId,
                    workflow_id:  recording.workflowId,
                    user_id:      userId,
                    data:         { workflowDataSnapshot, tracks, units, relations, dataBank },
                    created_at:   recording.createdAt,
                }, { onConflict: 'execution_id' })
                .throwOnError();
        }),

        get: withSupabaseAssert('recording.get', async (
            supabase:    SupabaseClient,
            executionId: Execution.Id,
        ): Promise<Recording> => {
            const { data } = await supabase
                .from('execution_recordings')
                .select('id, execution_id, workflow_id, user_id, data, created_at')
                .eq('execution_id', executionId)
                .single()
                .throwOnError();

            return Recording.Database.fromRow(Recording.Database.Row.Schema.parse(data));
        }),

        listByWorkflow: withSupabaseAssert('recording.listByWorkflow', async (
            supabase:   SupabaseClient,
            workflowId: Workflow.Id,
        ): Promise<Recording.Meta[]> => {
            const { data } = await supabase
                .from('execution_recordings')
                .select('id, execution_id, workflow_id, created_at')
                .eq('workflow_id', workflowId)
                .order('created_at', { ascending: false })
                .throwOnError();

            return (data ?? []).map(row => ({
                id:          row.id,
                executionId: row.execution_id,
                workflowId:  row.workflow_id,
                createdAt:   row.created_at,
            }));
        }),
    };

    public readonly meta = {
        get: withSupabaseAssert('execution.meta.get', async (
            supabase:    SupabaseClient,
            executionId: Execution.Id
        ): Promise<Execution.Meta> => {
            const { data } = await supabase
                .from('executions')
                .select('id, workflow_id, igniter, status, duration, error, chat_id, created_at, updated_at')
                .eq('id', executionId)
                .single()
                .throwOnError();

            return Execution.Meta.parse(data);
        }),

        list: withSupabaseAssert('execution.meta.list', async (
            supabase:   SupabaseClient,
            workflowId: Workflow.Id
        ): Promise<Execution.Meta[]> => {
            const { data } = await supabase
                .from('executions')
                .select('id, workflow_id, igniter, status, duration, error, chat_id, created_at, updated_at')
                .eq('workflow_id', workflowId)
                .order('created_at', { ascending: false })
                .throwOnError();

            return (data ?? []).map(row => Execution.Meta.parse(row));
        }),

        listActive: withSupabaseAssert('execution.meta.listActive', async (
            supabase: SupabaseClient,
        ): Promise<Execution.Meta[]> => {
            const { data } = await supabase
                .from('executions')
                .select('id, workflow_id, igniter, status, duration, error, chat_id, created_at, updated_at')
                .in('status', ['pending', 'running'])
                .order('created_at', { ascending: false })
                .throwOnError();

            return (data ?? []).map(row => Execution.Meta.parse(row));
        }),
    };
}
