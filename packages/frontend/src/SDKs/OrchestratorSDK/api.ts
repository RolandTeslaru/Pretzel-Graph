import z from "zod"
import { Orchestrator } from "@vx-agent-editor/shared/types";
import { api } from "../ApiInterceptorSDK"

export namespace OrchestratorAPI {

    export namespace Execution {
        export namespace Run {

            export async function execute(
                query: Orchestrator.API.Execution.Run.Request
            ): Promise<Orchestrator.API.Execution.Run.Response> {
                const { data } = await api.post<Orchestrator.API.Execution.Run.Response>(
                    '/api/orchestrator/execution/run',
                    query
                );
                return data;
            }
        }

        export namespace Pause {
            export async function execute(
                query: Orchestrator.API.Execution.Pause.Request
            ): Promise<Orchestrator.API.Execution.Pause.Response> {
                const { data } = await api.post<Orchestrator.API.Execution.Pause.Response>(
                    '/api/orchestrator/execution/pause',
                    query
                );
                return data;
            }
        }

        export namespace Terminate {
            export async function execute(
                query: Orchestrator.API.Execution.Terminate.Request
            ): Promise<Orchestrator.API.Execution.Terminate.Response> {
                const { data } = await api.post<Orchestrator.API.Execution.Terminate.Response>(
                    '/api/orchestrator/execution/terminate',
                    query
                );
                return data;
            }
        }
    }


    export namespace Schedule {

    }
} 