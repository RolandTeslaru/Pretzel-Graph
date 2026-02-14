import { Service } from "../ServiceManager";
import { Request, Response, Router } from 'express';
import { createAuthenticatedClient } from "@/utils/supabase";
import { Library, Workflow } from "@vx-agent-editor/shared/domain";
import { withAuth } from "../../utils/withAuth";

@Service("Library")
export class LibraryServiceImpl {
    constructor() { }

    public readonly ops = {
        workflow: {
            create: async function (token: string, payload: Library.API.Workflow.Create.Request) {
                const supabase = createAuthenticatedClient(token);

                const workflow = payload;

                const { data: result, error } = await supabase
                    .from('workflows')
                    .upsert(workflow)
                    .select()
                    .single();

                if (error) {
                    console.error("Supabase Upsert Error:", error);
                    throw new Error(error.message);
                }

                return result
            },
            get: async function (token: string, workflowId: string) {
                const supabase = createAuthenticatedClient(token);

                const { data, error } = await supabase
                    .from('workflows')
                    .select('*')
                    .eq('id', workflowId)
                    .single();

                if (error) throw new Error(error.message);
                return data;
            },
            list: async function (token: string, folderId?: string) {
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

    public readonly controller = {
        workflow: {
            create: withAuth(async (token, req) => {
                const payload = Library.API.Workflow.Create.Request.parse(req.body);
                return await this.ops.workflow.create(token, payload);
            }),

            get: withAuth(async (token, req) => {
                const { id } = req.params;
                return await this.ops.workflow.get(token, id as string);
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