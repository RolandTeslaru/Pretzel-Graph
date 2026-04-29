import { Injectable } from '@nestjs/common';
import { createAuthenticatedClient } from '@/utils/supabase';
import { Auth, ExecutionSession, Workflow } from '@pretzel-graph/shared/domain';
import { SupabaseClient } from '@supabase/supabase-js';
import { withSupabaseAssert } from '@pretzel-graph/shared/errors/supabase';
import { SystemError } from '@pretzel-graph/shared/domain/SystemError';

@Injectable()
export class ExecutionSessionService {
    public readonly dbOps = {
        upsert: withSupabaseAssert('executionSession.upsert', async (supabase: SupabaseClient, userId: Auth.User.Id, workflowId: Workflow.Id, session: ExecutionSession) => {
            const { data } = await supabase
                .from('execution_sessions')
                .upsert({
                    id: session.id,
                    data: session,
                    user_id: userId,
                    workflow_id: workflowId,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' })
                .select<string, { id: ExecutionSession.Id }>('id')
                .single()
                .throwOnError();

            return data!.id;
        }),
        get: withSupabaseAssert('executionSession.get', async (supabase: SupabaseClient, userId: Auth.User.Id, sessionId: ExecutionSession.Id) => {
            const { data: row } = await supabase
                .from('execution_sessions')
                .select<string, ExecutionSession.Database.Row>('id, data, created_at, updated_at')
                .eq('id', sessionId)
                .eq('user_id', userId)
                .single()
                .throwOnError();

            return ExecutionSession.Schema.parse(row.data);
        }),
        meta: {
            list: withSupabaseAssert('executionSession.meta.list', async (supabase: SupabaseClient, userId: Auth.User.Id, workflowId: Workflow.Id): Promise<ExecutionSession.Meta[]> => {
                const { data } = await supabase
                    .rpc('get_session_metas', { p_workflow_id: workflowId, p_user_id: userId })
                    .throwOnError();

                return (data ?? []) as ExecutionSession.Meta[];
            }),

            get: withSupabaseAssert('executionSession.meta.get', async (supabase: SupabaseClient, userId: Auth.User.Id, sessionId: ExecutionSession.Id): Promise<ExecutionSession.Meta> => {
                const { data } = await supabase
                    .rpc('get_session_meta', { p_session_id: sessionId, p_user_id: userId })
                    .throwOnError();

                const row = data?.[0];
                if (!row)
                    throw new SystemError(SystemError.Code.INFRA_UNKNOWN, 'Execution session not found');

                return row as ExecutionSession.Meta;
            }),
        },

        update: withSupabaseAssert('executionSession.update', async (supabase: SupabaseClient, userId: Auth.User.Id, sessionId: ExecutionSession.Id, updates: ExecutionSession.Update) => {
            const { data: oldSession } = await supabase
                .from('execution_sessions')
                .select<string, ExecutionSession.Database.Row["data"]>('data')
                .eq('id', sessionId)
                .eq('user_id', userId)
                .single()
                .throwOnError();

            const newSession = {
                ...oldSession,
                ...updates
            } satisfies ExecutionSession;

            const { data } = await supabase
                .from('execution_sessions')
                .update({
                    data: newSession,
                    updated_at: new Date().toISOString()
                })
                .eq('id', sessionId)
                .eq('user_id', userId)
                .select<string, ExecutionSession.Database.Row["data"]>('data')
                .single()
                .throwOnError();

            return data
        })
    };


    async create(
        token: string,
        userId: Auth.User.Id,
        payload: ExecutionSession.API.Create.Request
    ): Promise<ExecutionSession.API.Create.Response> {
        const supabase = createAuthenticatedClient(token);
        const { workflowId, session } = payload;
        await this.dbOps.upsert(supabase, userId, workflowId, session);
        return { session };
    }


    async get(
        token: string,
        userId: Auth.User.Id,
        payload: ExecutionSession.API.Get.Request
    ): Promise<ExecutionSession.API.Get.Response> {
        const supabase = createAuthenticatedClient(token);
        const { id } = payload;
        const session = await this.dbOps.get(supabase, userId, id);
        return { session };
    }


    async update(
        token: string,
        userId: Auth.User.Id,
        payload: ExecutionSession.API.Update.Request
    ): Promise<ExecutionSession.API.Update.Response> {
        const supabase = createAuthenticatedClient(token);
        const { id, session } = payload;
        const updatedSession = await this.dbOps.update(supabase, userId, id, session);
        return { session: updatedSession };
    }


    async listMeta(
        token: string,
        userId: Auth.User.Id,
        payload: ExecutionSession.API.Meta.List.Request
    ): Promise<ExecutionSession.API.Meta.List.Response> {
        const supabase = createAuthenticatedClient(token);
        const { workflowId } = payload;
        const sessionMetas = await this.dbOps.meta.list(supabase, userId, workflowId);
        return { sessionMetas };
    }


    async getMeta(
        token: string,
        userId: Auth.User.Id,
        payload: ExecutionSession.API.Meta.Get.Request
    ): Promise<ExecutionSession.API.Meta.Get.Response> {
        const supabase = createAuthenticatedClient(token);
        const { id } = payload;
        const sessionMeta = await this.dbOps.meta.get(supabase, userId, id);
        return { sessionMeta };
    }
}


