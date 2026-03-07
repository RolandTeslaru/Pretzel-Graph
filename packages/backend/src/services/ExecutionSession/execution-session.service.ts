import { Injectable } from '@nestjs/common';
import { createAuthenticatedClient, getUserId } from '@/utils/supabase';
import { Auth, ExecutionSession, Workflow } from '@vx-agent-editor/shared/domain';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class ExecutionSessionService {
    public readonly dbOps = {
        upsert: async (supabase: SupabaseClient, userId: Auth.User.Id, workflowId: Workflow.Id, session: ExecutionSession) => {
            const { data, error } = await supabase
                .from('execution_sessions')
                .upsert({
                    id: session.id,
                    data: session,
                    user_id: userId,
                    workflow_id: workflowId,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' })
                .select('id')
                .single();

            if (error) throw error;
            return data.id as ExecutionSession.Id;
        },
        get: async (supabase: SupabaseClient, userId: Auth.User.Id, sessionId: ExecutionSession.Id) => {
            const { data, error } = await supabase
                .from('execution_sessions')
                .select('data')
                .eq('id', sessionId)
                .eq('user_id', userId)
                .single();

            if (error) throw error;
            return data.data as ExecutionSession;
        },
        update: async (supabase: SupabaseClient, userId: Auth.User.Id, sessionId: ExecutionSession.Id, updates: ExecutionSession.Update) => {
            const { data: existingData, error: getError } = await supabase
                .from('execution_sessions')
                .select('data')
                .eq('id', sessionId)
                .eq('user_id', userId)
                .single();

            if (getError) throw getError;

            const newSession = {
                ...existingData.data,
                ...updates
            } satisfies ExecutionSession;

            const { data, error } = await supabase
                .from('execution_sessions')
                .update({
                    data: newSession,
                    updated_at: new Date().toISOString()
                })
                .eq('id', sessionId)
                .eq('user_id', userId)
                .select('data')
                .single();

            if (error) 
                throw error;
            return data.data as ExecutionSession;
        }
    };

    async create(
        token: string,
        payload: ExecutionSession.API.Create.Request
    ): Promise<ExecutionSession.API.Create.Response> {
        const supabase = createAuthenticatedClient(token);

        const userId = await getUserId(supabase) as Auth.User.Id;
        if (!userId)
            throw new Error("User not found");

        const { workflowId, session } = payload;
        await this.dbOps.upsert(supabase, userId, workflowId, session);
        return { session };
    }


    async get(
        token: string,
        payload: ExecutionSession.API.Get.Request
    ): Promise<ExecutionSession.API.Get.Response> {
        const supabase = createAuthenticatedClient(token);

        const userId = await getUserId(supabase) as Auth.User.Id;
        if (!userId)
            throw new Error("User not found");

        const { id } = payload;
        const session = await this.dbOps.get(supabase, userId, id);
        return { session };
    }


    async update(
        token: string,
        payload: ExecutionSession.API.Update.Request
    ): Promise<ExecutionSession.API.Update.Response> {
        const supabase = createAuthenticatedClient(token);

        const userId = await getUserId(supabase) as Auth.User.Id;
        if (!userId)
            throw new Error("User not found");

        const { id, session } = payload;
        const updatedSession = await this.dbOps.update(supabase, userId, id, session);
        return { session: updatedSession };
    }
}
