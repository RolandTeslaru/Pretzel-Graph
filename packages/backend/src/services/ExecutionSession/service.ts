import { Service } from "../ServiceManager";
import { Router, Request, Response } from "express";
import { WithAuth, withAuth } from "@/handlers/controller";
import { createAuthenticatedClient } from "@/utils/supabase";
import { ExecutionSession } from "@vx-agent-editor/shared/domain";
import { WithSupabase } from "@/handlers/database";

@Service("ExecutionSession")
export class ExecutionSessionServiceImpl {

    constructor() { }

    private readonly dbOps: ExecutionSessionService.DbOps = {
        create: async (supabase, session) => {
            const { data, error } = await supabase
                .from('execution_sessions')
                .insert(session)
                .select('id')
                .single();

            if (error) throw error;
            return data.id as ExecutionSession.Id;
        },
        get: async (supabase, sessionId) => {
            const { data, error } = await supabase
                .from('execution_sessions')
                .select('*')
                .eq('id', sessionId)
                .single();

            if (error) throw error;
            return data as ExecutionSession;
        },
        update: async (supabase, sessionId, updates) => {
            const { data, error } = await supabase
                .from('execution_sessions')
                .update(updates)
                .eq('id', sessionId)
                .select()
                .single();

            if (error) throw error;
            return data as ExecutionSession;
        }
    }

    public readonly ops: ExecutionSessionService.Ops = {
        create: async (token, { workflowId, session }) => {
            const supabase = createAuthenticatedClient(token);
            await this.dbOps.create(supabase, session);
            return { session };
        },
        get: async (token, { id }) => {
            const supabase = createAuthenticatedClient(token);
            const session = await this.dbOps.get(supabase, id);
            return { session };
        },
        update: async (token, { id, session }) => {
            const supabase = createAuthenticatedClient(token);
            const updatedSession = await this.dbOps.update(supabase, id, session);
            return { session: updatedSession };
        }
    }

    public readonly controller: ExecutionSessionService.Controller = {
        create: withAuth(async (token, req) => {
            const payload = ExecutionSession.API.Create.Request.parse(req.body);
            return await this.ops.create(token, payload);
        }),
        get: withAuth(async (token, req) => {
            const payload = ExecutionSession.API.Get.Request.parse(req.body);
            return await this.ops.get(token, payload);
        }),
        update: withAuth(async (token, req) => {
            const payload = ExecutionSession.API.Update.Request.parse(req.body);
            return await this.ops.update(token, payload);
        })
    }

    public readonly routes = Router()
        .post("/create", this.controller.create)
        .post("/get", this.controller.get)
        .post("/update", this.controller.update)
}

export const ExecutionSessionService = Service.get<ExecutionSessionServiceImpl>("ExecutionSession");

export namespace ExecutionSessionService {
    export type DbOps = {
        create: WithSupabase<(session: ExecutionSession) => Promise<ExecutionSession.Id>>
        get: WithSupabase<(sessionId: ExecutionSession.Id) => Promise<ExecutionSession>>
        update: WithSupabase<(sessionId: ExecutionSession.Id, session: ExecutionSession.Update) => Promise<ExecutionSession>>
    }

    export type Ops = {
        create: WithAuth<(payload: ExecutionSession.API.Create.Request) => Promise<ExecutionSession.API.Create.Response>>
        get: WithAuth<(payload: ExecutionSession.API.Get.Request) => Promise<ExecutionSession.API.Get.Response>>
        update: WithAuth<(payload: ExecutionSession.API.Update.Request) => Promise<ExecutionSession.API.Update.Response>>
    }

    export type Controller = {
        create: (req: Request, res: Response) => void
        get: (req: Request, res: Response) => void
        update: (req: Request, res: Response) => void
    }
}
