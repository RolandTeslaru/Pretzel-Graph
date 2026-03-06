import { Injectable } from '@nestjs/common';
import { createAuthenticatedClient } from '@/utils/supabase';
import { ExecutionSession } from '@vx-agent-editor/shared/domain';

@Injectable()
export class ExecutionSessionService {
    private readonly dbOps = {
        create: async (supabase: any, session: ExecutionSession) => {
            const { data, error } = await supabase
                .from('execution_sessions')
                .insert(session)
                .select('id')
                .single();

            if (error) throw error;
            return data.id as ExecutionSession.Id;
        },
        get: async (supabase: any, sessionId: ExecutionSession.Id) => {
            const { data, error } = await supabase
                .from('execution_sessions')
                .select('*')
                .eq('id', sessionId)
                .single();

            if (error) throw error;
            return data as ExecutionSession;
        },
        update: async (supabase: any, sessionId: ExecutionSession.Id, updates: ExecutionSession.Update) => {
            const { data, error } = await supabase
                .from('execution_sessions')
                .update(updates)
                .eq('id', sessionId)
                .select()
                .single();

            if (error) throw error;
            return data as ExecutionSession;
        }
    };


    async create(
        token: string, 
        payload: ExecutionSession.API.Create.Request
    ): Promise<ExecutionSession.API.Create.Response> {
        const supabase = createAuthenticatedClient(token);
        const { workflowId, session } = payload;
        await this.dbOps.create(supabase, session);
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
