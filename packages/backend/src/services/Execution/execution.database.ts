import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { Auth, Chat, Execution, Recording, Workflow } from '@pretzel-graph/shared/domain';
import { SystemError } from '@pretzel-graph/shared/domain/SystemError';
import { SupabaseAssert, ZodReturn } from '../../decorators/database';

class RecordingMethods {

    @SupabaseAssert('recording.upsert')
    async upsert(supabase: SupabaseClient, recording: Recording, userId: Auth.User.Id): Promise<void> {
        const { tracks, units, relations, dataBank } = recording;
        await supabase
            .from('execution_recordings')
            .upsert({
                id:           recording.id,
                execution_id: recording.executionId,
                workflow_id:  recording.workflowId,
                user_id:      userId,
                data:         { tracks, units, relations, dataBank },
                created_at:   recording.createdAt,
            }, { onConflict: 'execution_id' })
            .throwOnError();
    }

    @SupabaseAssert('recording.get')
    async get(supabase: SupabaseClient, executionId: Execution.Id): Promise<Recording> {
        const { data } = await supabase
            .from('execution_recordings')
            .select('id, execution_id, workflow_id, user_id, data, created_at')
            .eq('execution_id', executionId)
            .single()
            .throwOnError();

        return Recording.Database.fromRow(Recording.Database.Row.Schema.parse(data));
    }

    @SupabaseAssert('recording.listByWorkflow')
    async listByWorkflow(supabase: SupabaseClient, workflowId: Workflow.Id): Promise<Recording.Meta[]> {
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
    }
}

class MetaMethods {

    @SupabaseAssert('execution.meta.get')
    @ZodReturn(Execution.Meta)
    async get(supabase: SupabaseClient, executionId: Execution.Id): Promise<Execution.Meta> {
        const { data } = await supabase
            .from('executions')
            .select('id, workflow_id, igniter, status, duration, error, chat_id, created_at, updated_at')
            .eq('id', executionId)
            .single()
            .throwOnError();

        return data;
    }

    @SupabaseAssert('execution.meta.list')
    @ZodReturn(Execution.Meta.array())
    async list(supabase: SupabaseClient, workflowId: Workflow.Id): Promise<Execution.Meta[]> {
        const { data } = await supabase
            .from('executions')
            .select('id, workflow_id, igniter, status, duration, error, chat_id, created_at, updated_at')
            .eq('workflow_id', workflowId)
            .order('created_at', { ascending: false })
            .throwOnError();

        return data ?? [];
    }

    @SupabaseAssert('execution.meta.listActive')
    @ZodReturn(Execution.Meta.array())
    async listActive(supabase: SupabaseClient): Promise<Execution.Meta[]> {
        const { data } = await supabase
            .from('executions')
            .select('id, workflow_id, igniter, status, duration, error, chat_id, created_at, updated_at')
            .in('status', ['pending', 'running'])
            .order('created_at', { ascending: false })
            .throwOnError();

        return data ?? [];
    }
}

@Injectable()
export class ExecutionDatabase {

    public readonly recording = new RecordingMethods();
    public readonly meta      = new MetaMethods();

    @SupabaseAssert('execution.create')
    async create(supabase: SupabaseClient, props: {
        workflowId:   Workflow.Id,
        userId:       Auth.User.Id,
        igniter:      Execution.Igniter,
        session:      Execution.Session,
        executionId?: Execution.Id,
        chatId?:      Chat.Id,
    }): Promise<Execution.Id> {
        const executionId = props.executionId ?? crypto.randomUUID() as Execution.Id;
        await supabase
            .from('executions')
            .insert({
                id:          executionId,
                workflow_id: props.workflowId,
                user_id:     props.userId,
                igniter:     props.igniter,
                status:      'pending',
                duration:    0,
                session:     props.session,
                chat_id:     props.chatId ?? null,
                created_at:  new Date(),
                updated_at:  new Date(),
            })
            .throwOnError();
        return executionId;
    }

    @SupabaseAssert('execution.update')
    async update(supabase: SupabaseClient, props: {
        executionId: Execution.Id,
        status?:     Execution.Status,
        error?:      string,
        session?:    Execution.Session.Update,
    }): Promise<void> {
        await supabase
            .from('executions')
            .update({
                ...(props.status  !== undefined && { status:  props.status }),
                ...(props.error   !== undefined && { error:   props.error }),
                ...(props.session !== undefined && { session: props.session }),
                updated_at: new Date(),
            })
            .eq('id', props.executionId)
            .throwOnError();
    }

    @SupabaseAssert('execution.getStatus')
    @ZodReturn(Execution.Status)
    async getStatus(supabase: SupabaseClient, executionId: Execution.Id): Promise<Execution.Status> {
        const { data } = await supabase
            .from('executions')
            .select<'status', { status: string }>('status')
            .eq('id', executionId)
            .single()
            .throwOnError();

        return data!.status as Execution.Status;
    }

    @SupabaseAssert('execution.get')
    @ZodReturn(Execution.Schema)
    async get(supabase: SupabaseClient, executionId: Execution.Id): Promise<Execution> {
        const { data } = await supabase
            .from('executions')
            .select('id, workflow_id, igniter, status, duration, error, session, chat_id, created_at, updated_at')
            .eq('id', executionId)
            .single()
            .throwOnError();

        return data;
    }

    @SupabaseAssert('execution.sdk.getActivePublishedWorkflowData')
    @ZodReturn(Workflow.Data.Schema)
    async getActivePublishedWorkflowData(supabase: SupabaseClient, workflowId: Workflow.Id): Promise<Workflow.Data> {
        const { data: row } = await supabase
            .from('version_control')
            .select('workflow_data')
            .eq('workflow_id', workflowId)
            .eq('is_active', true)
            .single()
            .throwOnError();

        if (!row)
            throw new SystemError(SystemError.Code.NOT_FOUND, 'No active published version found for this workflow');

        return row.workflow_data;
    }

    @SupabaseAssert('execution.listActiveIds')
    @ZodReturn(Execution.Id.array())
    async listActiveIds(supabase: SupabaseClient): Promise<Execution.Id[]> {
        const { data } = await supabase
            .from('executions')
            .select('id')
            .in('status', ['pending', 'running'])
            .throwOnError();

        return (data ?? []).map(row => row.id);
    }

    @SupabaseAssert('execution.terminateMany')
    async terminateMany(supabase: SupabaseClient, executionIds: Execution.Id[], error: string): Promise<void> {
        if (executionIds.length === 0) return;

        await supabase
            .from('executions')
            .update({ status: 'terminated', error, updated_at: new Date() })
            .in('id', executionIds)
            .throwOnError();
    }
}
