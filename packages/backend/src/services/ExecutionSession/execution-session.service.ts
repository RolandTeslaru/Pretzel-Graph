import { Injectable } from '@nestjs/common';
import { createAuthenticatedClient } from '@/utils/supabase';
import { ExecutionSession } from '@vx-agent-editor/shared/domain';

@Injectable()
export class ExecutionSessionService {
    public readonly dbOps = {
        upsert: async (supabase: any, session: ExecutionSession) => {
            const { data, error } = await supabase
                .from('execution_sessions')
                .upsert({
                    id: session.id,
                    data: session,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' })
                .select('id')
                .single();

            if (error) throw error;
            return data.id as ExecutionSession.Id;
        },
        get: async (supabase: any, sessionId: ExecutionSession.Id) => {
            const { data, error } = await supabase
                .from('execution_sessions')
                .select('data')
                .eq('id', sessionId)
                .single();

            if (error) throw error;
            return data.data as ExecutionSession;
        },
        update: async (supabase: any, sessionId: ExecutionSession.Id, updates: ExecutionSession.Update) => {
            const { data: existingData, error: getError } = await supabase
                .from('execution_sessions')
                .select('data')
                .eq('id', sessionId)
                .single();

            if (getError) throw getError;

            const newSession = {
                ...existingData.data,
                ...updates
            } as ExecutionSession;

            const { data, error } = await supabase
                .from('execution_sessions')
                .update({
                    data: newSession,
                    updated_at: new Date().toISOString()
                })
                .eq('id', sessionId)
                .select('data')
                .single();

            if (error) throw error;
            return data.data as ExecutionSession;
        }
    };

    async create(
        token: string,
        payload: ExecutionSession.API.Create.Request
    ): Promise<ExecutionSession.API.Create.Response> {
        const supabase = createAuthenticatedClient(token);
        const { workflowId, session } = payload;
        await this.dbOps.upsert(supabase, session);
        return { session };
    }


    async get(
        token: string,
        payload: ExecutionSession.API.Get.Request
    ): Promise<ExecutionSession.API.Get.Response> {
        const supabase = createAuthenticatedClient(token);
        const { id } = payload;
        const session = await this.dbOps.get(supabase, id);
        return { session };
    }


    async update(
        token: string,
        payload: ExecutionSession.API.Update.Request
    ): Promise<ExecutionSession.API.Update.Response> {
        const supabase = createAuthenticatedClient(token);
        const { id, session } = payload;
        const updatedSession = await this.dbOps.update(supabase, id, session);
        return { session: updatedSession };
    }
}
