import { Service } from "../ServiceManager";
import { Request, Response, Router } from 'express';
import { createAuthenticatedClient } from "@/utils/supabase";
import { Library } from "@vx-agent-editor/shared/domain";
import { WithAuth, withAuth } from "@/handlers/controller";

@Service("Library")
export class LibraryServiceImpl {
    constructor() { }

    public readonly ops: LibraryService.Ops = {
        workflow: {
            create: async (token, payload) => {
                const supabase = createAuthenticatedClient(token);

                const { data: result, error } = await supabase
                    .from('workflows')
                    .upsert(payload)
                    .select()
                    .single();

                if (error) {
                    console.error("Supabase Upsert Error:", error);
                    throw new Error(error.message);
                }

                return result
            },
            get: async (token, workflowId) => {
                const supabase = createAuthenticatedClient(token);

                const { data, error } = await supabase
                    .from('workflows')
                    .select('*')
                    .eq('id', workflowId)
                    .single();

                if (error) throw new Error(error.message);
                return data;
            },
            list: async (token, folderId) => {
                const supabase = createAuthenticatedClient(token);

                let query = supabase
                    .from('workflows')
                    .select('id, user_id, display_name, description, locked, mcp_enabled, created_at, updated_at')

                if (folderId) {
                    // If we re-introduce folders, query here
                }

                const { data, error } = await query;
                if (error) throw new Error(error.message);

                return data;
            }
        }
    }

    public readonly controller: LibraryService.Controller = {
        workflow: {
            create: withAuth(async (token, req) => {
                const payload = Library.API.Workflow.Create.Request.parse(req.body);
                return await this.ops.workflow.create(token, payload);
            }),

            get: withAuth(async (token, req) => {
                const id = req.params.id as string;
                return await this.ops.workflow.get(token, id);
            }),

            list: withAuth(async (token, req) => {
                const folderId = req.query.folderId as string | undefined;
                return await this.ops.workflow.list(token, folderId);
            })
        }
    }

    public readonly routes = Router()
        .post("/workflows", this.controller.workflow.create)
        .get('/workflows/:id', this.controller.workflow.get)
        .get('/workflows', this.controller.workflow.list)
}

export const LibraryService = Service.get<LibraryServiceImpl>("Library");

export namespace LibraryService {

    export type Ops = {
        workflow: {
            create: WithAuth<(payload: Library.API.Workflow.Create.Request) => Promise<Library.API.Workflow.Create.Response>>
            get:    WithAuth<(workflowId: string) => Promise<Library.API.Workflow.Get.Response>>
            list:   WithAuth<(folderId?: string) => Promise<Library.API.Workflow.List.Response>>
        }
    }

    export type Controller = {
        workflow: {
            create: (req: Request, res: Response) => void
            get: (req: Request, res: Response) => void
            list: (req: Request, res: Response) => void
        }
    }
}