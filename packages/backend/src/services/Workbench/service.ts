import { Router } from "express";
import { Service } from "../ServiceManager";
import { Orchestrator, Workbench } from "@vx-agent-editor/shared/domain";
import { CatalogueService as AGGEXCatalogueService } from "@vx-agent-builder/vx-aggex"
import { withAuth } from "@/handlers/controller";
import Redis from "ioredis";
import { REDIS_HOST, REDIS_PORT } from "@vx-agent-editor/shared/constants";


@Service("Workbench")
export class WorkbenchServiceImpl {
    constructor() { }

    public readonly ops = {
        field: {
            reconcile: async (payload) => {
                const { fieldId, blueprintId, newValue } = payload;
                
                const reconcileFn = await AGGEXCatalogueService.getReconciler(blueprintId);

                if (!reconcileFn)
                    throw new Error(`Reconciler for node ${blueprintId} not found`);

                const reconciledBlueprint = reconcileFn(fieldId, newValue);

                return { reconciledBlueprint };
            }
        }
    } satisfies WorkbenchService.Ops

    public readonly controller = {
        field: {
            reconcile: withAuth(async (_, req) => {
                const payload = Workbench.API.Field.Reconcile.Request.parse(req.body);
                return await this.ops.field.reconcile(payload);
            })
        },
        chat: {
            streamOutput: withAuth(async (_, req, res) => {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');

                res.write('data: Connected to the stream!\n\n');

                const redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT })
                
                const payload = Workbench.API.Chat.StreamOutput.Request.parse(req.body);

                const topic = `job:${payload.jobId}:chat:streamOutput`
            
                redis.on("message", (channel, message) => {
                    if(channel != topic) 
                        return

                    const event = Orchestrator.Event.Job.ConversationChunk.parse(JSON.parse(message));

                    if(event.type === "job:node_messages:conversation_chunk") {
                        res.write(`data: ${JSON.stringify(event.chunk)}\n\n`);
                    }
                    else if (
                        event.type === "job:completed" || 
                        event.type === "job:failed" || 
                        event.type === "job:terminated"
                    ) {
                        redis.quit()
                        res.end();
                    }
                })

                await redis.subscribe(topic);

                req.on('close', () => {
                    console.log("Client disconnected")
                    redis.unsubscribe();
                    redis.quit();
                    res.end();
                })
            }),
            input: withAuth(async (_, req) => {
                
            })
        }
    }

    public readonly routes = Router()
        .post("/field/reconcile", this.controller.field.reconcile)
        .get("/chat/streamOutput", this.controller.chat.streamOutput)
}

export const WorkbenchService = Service.get<WorkbenchServiceImpl>("Workbench");

export namespace WorkbenchService {
    export type Ops = {
        field: {
            reconcile: (payload: Workbench.API.Field.Reconcile.Request) => Promise<Workbench.API.Field.Reconcile.Response>
        }
    }
}