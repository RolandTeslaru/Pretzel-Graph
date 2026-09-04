import type { AxiosInstance } from "axios"
import z from "zod"
import { Workflow as WorkflowNs } from "../Workflow"
import { Foundations } from "../Foundations"
import { Vault } from "../Vault"
import { Operations } from "./Operations"

export namespace API {
    export namespace Workflow {
        export namespace Create {
            export const Request = z.object({
                workflow: WorkflowNs.Schema,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                workflow_id: WorkflowNs.Id,
            })
            export type Response = z.infer<typeof Response>
        }

        export async function create(api: AxiosInstance, request: Create.Request): Promise<Create.Response> {
            const { data } = await api.post<Create.Response>("/api/workbench/workflows", request)
            return data
        }

        export namespace Get {
            export const Request = z.object({
                workflowId: WorkflowNs.Id,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                workflow: WorkflowNs.Schema,
                blueprints: z.record(Foundations.Blueprint.Id, Foundations.Blueprint.Schema),
                repairs: z.array(WorkflowNs.Repair.Schema),
            })
            export type Response = z.infer<typeof Response>
        }

        export async function get(api: AxiosInstance, request: Get.Request, abortSignal?: AbortSignal): Promise<Get.Response> {
            const { data } = await api.get<Get.Response>(`/api/workbench/workflows/${request.workflowId}`, { signal: abortSignal })
            return data
        }

        export namespace Commit {
            export const Request = z.object({
                workflowId: WorkflowNs.Id,
                data: WorkflowNs.Data.Schema,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({})
            export type Response = z.infer<typeof Response>
        }

        export async function commit(api: AxiosInstance, request: Commit.Request): Promise<Commit.Response> {
            const { data } = await api.post<Commit.Response>(
                "/api/workbench/workflows/commit",
                request,
                { timeout: 8_000 },
            )
            return data
        }
    }

    export namespace Dependency {
        export namespace Published {
            export namespace Load {
                export const Request = z.object({
                    dependencyId: WorkflowNs.Id,
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    dependency: WorkflowNs.Dependency.Publication.Schema,
                })
                export type Response = z.infer<typeof Response>
            }

            export async function load(api: AxiosInstance, request: Published.Load.Request): Promise<Published.Load.Response> {
                const { data } = await api.get<Published.Load.Response>(`/api/workbench/dependencies/workflows/${request.dependencyId}/published`)
                return data
            }

            export namespace CheckUpdates {
                export const Request = z.object({
                    dependencies: z.array(z.object({
                        workflowId:    WorkflowNs.Id,
                        publicationId: WorkflowNs.Dependency.Publication.Id,
                    })),
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    updates: WorkflowNs.Dependency.Publication.UpdateMap,
                })
                export type Response = z.infer<typeof Response>
            }

            export async function checkUpdates(api: AxiosInstance, request: Published.CheckUpdates.Request): Promise<Published.CheckUpdates.Response> {
                const { data } = await api.post<Published.CheckUpdates.Response>(`/api/workbench/dependencies/check-updates`, request)
                return data
            }
        }

        export namespace Draft {
            export namespace Load {
                export const Request = z.object({
                    dependencyId: WorkflowNs.Id,
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    dependency: WorkflowNs.Dependency.Draft.Schema,
                })
                export type Response = z.infer<typeof Response>
            }

            export async function load(api: AxiosInstance, request: Draft.Load.Request): Promise<Draft.Load.Response> {
                const { data } = await api.get<Draft.Load.Response>(`/api/workbench/dependencies/workflows/${request.dependencyId}/draft`)
                return data
            }

            export namespace CheckUpdates {
                export const Request = z.object({
                    dependencies: z.array(z.object({
                        workflowId:          WorkflowNs.Id,
                        workflow_updated_at: z.coerce.date(),
                    })),
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    updates: z.record(WorkflowNs.Id, WorkflowNs.Dependency.Draft.UpdateInfo),
                })
                export type Response = z.infer<typeof Response>
            }

            export async function checkUpdates(api: AxiosInstance, request: Draft.CheckUpdates.Request): Promise<Draft.CheckUpdates.Response> {
                const { data } = await api.post<Draft.CheckUpdates.Response>(`/api/workbench/dependencies/check-draft-updates`, request)
                return data
            }
        }
    }

    export namespace Field {
        export namespace ResourceLoader {
            export namespace LoadOptions {
                export const Request = z.object({
                    blueprintId: Foundations.Blueprint.Id,
                    loaderId: Foundations.Field.ResourceLoader.LoaderId,
                    fieldValues: z.record(z.string(), z.any()).default({}),
                    credentialInstanceIds: z.record(
                        Vault.Credential.Template.Id,
                        Vault.Credential.Instance.Id,
                    ).default({}),
                    searchQuery: z.string().optional(),
                    paginationCursor: z.string().optional(),
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    options: z.array(Foundations.Field.ResourceLoader.OptionItem),
                    nextPaginationCursor: z.string().optional(),
                })
                export type Response = z.infer<typeof Response>
            }

            export async function loadOptions(
                api: AxiosInstance,
                request: LoadOptions.Request,
            ): Promise<LoadOptions.Response> {
                const { data } = await api.post<LoadOptions.Response>(
                    '/api/workbench/field/resource-loader/load-options', request
                )
                return data
            }
        }
    }

    // A worker-side hold on a workflow. The backend keeps one transaction open, row-locked, from
    // begin to commit, and the document being edited lives in that session: every operation is a
    // request that applies one edit there and announces it. Keyed by the execution behind the
    // delegate, so nothing travels but the workflow id.
    export namespace Session {
        const Position = z.object({ x: z.number(), y: z.number() })

        export namespace Begin {
            export const Response = z.object({ workflowId: WorkflowNs.Id })
            export type Response = z.infer<typeof Response>
        }

        export namespace Commit {
            export const Response = z.object({})
            export type Response = z.infer<typeof Response>
        }

        export namespace Workflow {
            export namespace Get {
                export type Response = ReturnType<typeof Operations.workflow.get>
            }
            export namespace QueryNodes {
                export const Request = z.object({
                    ids:          z.array(WorkflowNs.Node.Id).optional(),
                    blueprintIds: z.array(Foundations.Blueprint.Id).optional(),
                    displayName:  z.string().optional(),
                    upstreamOf:   z.array(WorkflowNs.Node.Id).optional(),
                    downstreamOf: z.array(WorkflowNs.Node.Id).optional(),
                    limit:        z.number().int().positive().max(500).optional(),
                })
                export type Request  = z.infer<typeof Request>
                export type Response = ReturnType<typeof Operations.workflow.queryNodes>
            }
            export namespace QueryEdges {
                export const Request = z.object({
                    nodeIds:       z.array(WorkflowNs.Node.Id).optional(),
                    sourceNodeIds: z.array(WorkflowNs.Node.Id).optional(),
                    targetNodeIds: z.array(WorkflowNs.Node.Id).optional(),
                    limit:         z.number().int().positive().max(500).optional(),
                })
                export type Request  = z.infer<typeof Request>
                export type Response = ReturnType<typeof Operations.workflow.queryEdges>
            }
            export namespace Layout {
                export type Response = ReturnType<typeof Operations.workflow.layout>
            }
            export namespace Meta {
                export const Response = WorkflowNs.Meta.Schema
                export type Response = z.infer<typeof Response>
            }

            export async function get(api: AxiosInstance, workflowId: WorkflowNs.Id): Promise<Get.Response> {
                const { data } = await api.get<Get.Response>(`/api/internal/workbench/workflows/${workflowId}`)
                return data
            }

            export async function queryNodes(api: AxiosInstance, workflowId: WorkflowNs.Id, request: QueryNodes.Request): Promise<QueryNodes.Response> {
                const { data } = await api.post<QueryNodes.Response>(`/api/internal/workbench/workflows/${workflowId}/nodes/query`, request)
                return data
            }

            export async function queryEdges(api: AxiosInstance, workflowId: WorkflowNs.Id, request: QueryEdges.Request): Promise<QueryEdges.Response> {
                const { data } = await api.post<QueryEdges.Response>(`/api/internal/workbench/workflows/${workflowId}/edges/query`, request)
                return data
            }

            export async function layout(api: AxiosInstance, workflowId: WorkflowNs.Id): Promise<Layout.Response> {
                const { data } = await api.get<Layout.Response>(`/api/internal/workbench/workflows/${workflowId}/layout`)
                return data
            }

            export async function getMeta(api: AxiosInstance, workflowId: WorkflowNs.Id): Promise<Meta.Response> {
                const { data } = await api.get<Meta.Response>(`/api/internal/workbench/workflows/${workflowId}/meta`)
                return data
            }
        }

        export namespace Node {
            export namespace Get {
                export type Response = ReturnType<typeof Operations.node.get>
            }
            export namespace Create {
                export const Request = z.object({
                    blueprintId:  Foundations.Blueprint.Id,
                    /** Omitted: placed to the right of the rightmost node. */
                    position:     Position.optional(),
                    staticValues: z.record(z.string(), z.unknown()).optional(),
                })
                export type Request  = z.infer<typeof Request>
                export type Response = ReturnType<typeof Operations.node.create>
            }
            export namespace Delete {
                export const Request = z.object({ nodeId: WorkflowNs.Node.Id })
                export type Request  = z.infer<typeof Request>
                export type Response = ReturnType<typeof Operations.node.delete>
            }
            export namespace Move {
                export const Request = z.object({ nodeId: WorkflowNs.Node.Id, position: Position })
                export type Request  = z.infer<typeof Request>
                export type Response = ReturnType<typeof Operations.node.move>
            }

            export async function get(api: AxiosInstance, workflowId: WorkflowNs.Id, nodeId: WorkflowNs.Node.Id): Promise<Get.Response> {
                const { data } = await api.get<Get.Response>(`/api/internal/workbench/workflows/${workflowId}/nodes/${encodeURIComponent(nodeId)}`)
                return data
            }

            export async function create(api: AxiosInstance, workflowId: WorkflowNs.Id, request: Create.Request): Promise<Create.Response> {
                const { data } = await api.post<Create.Response>(`/api/internal/workbench/workflows/${workflowId}/session/node/create`, request)
                return data
            }

            export async function remove(api: AxiosInstance, workflowId: WorkflowNs.Id, request: Delete.Request): Promise<Delete.Response> {
                const { data } = await api.post<Delete.Response>(`/api/internal/workbench/workflows/${workflowId}/session/node/delete`, request)
                return data
            }

            export async function move(api: AxiosInstance, workflowId: WorkflowNs.Id, request: Move.Request): Promise<Move.Response> {
                const { data } = await api.post<Move.Response>(`/api/internal/workbench/workflows/${workflowId}/session/node/move`, request)
                return data
            }
        }

        export namespace Edge {
            export namespace Create {
                export const Request = z.object({
                    source:       WorkflowNs.Node.Id,
                    sourceHandle: Foundations.Port.Output.Id,
                    target:       WorkflowNs.Node.Id,
                    targetHandle: Foundations.Port.Input.Id,
                })
                export type Request  = z.infer<typeof Request>
                export type Response = ReturnType<typeof Operations.edge.create>
            }
            export namespace Delete {
                export const Request = z.object({ edgeId: WorkflowNs.Edge.Id })
                export type Request  = z.infer<typeof Request>
                export type Response = ReturnType<typeof Operations.edge.delete>
            }

            export async function create(api: AxiosInstance, workflowId: WorkflowNs.Id, request: Create.Request): Promise<Create.Response> {
                const { data } = await api.post<Create.Response>(`/api/internal/workbench/workflows/${workflowId}/session/edge/create`, request)
                return data
            }

            export async function remove(api: AxiosInstance, workflowId: WorkflowNs.Id, request: Delete.Request): Promise<Delete.Response> {
                const { data } = await api.post<Delete.Response>(`/api/internal/workbench/workflows/${workflowId}/session/edge/delete`, request)
                return data
            }
        }

        export namespace Field {
            export namespace Get {
                export type Response = ReturnType<typeof Operations.field.get>
            }
            export namespace Set {
                export const Request = z.object({
                    nodeId:  WorkflowNs.Node.Id,
                    fieldId: Foundations.Field.Id,
                    value:   z.unknown(),
                })
                export type Request  = z.infer<typeof Request>
                export type Response = ReturnType<typeof Operations.field.set>
            }

            export async function get(api: AxiosInstance, workflowId: WorkflowNs.Id, nodeId: WorkflowNs.Node.Id, fieldId: Foundations.Field.Id): Promise<Get.Response> {
                const { data } = await api.get<Get.Response>(`/api/internal/workbench/workflows/${workflowId}/nodes/${encodeURIComponent(nodeId)}/fields/${encodeURIComponent(fieldId)}`)
                return data
            }

            export async function set(api: AxiosInstance, workflowId: WorkflowNs.Id, request: Set.Request): Promise<Set.Response> {
                const { data } = await api.post<Set.Response>(`/api/internal/workbench/workflows/${workflowId}/session/field/set`, request)
                return data
            }
        }

        // One edit, tagged. A batch is a list of these applied in order; the single-operation
        // routes take the untagged request.
        export const Operation = z.discriminatedUnion("op", [
            Node.Create.Request.extend({ op: z.literal("node.create") }),
            Node.Delete.Request.extend({ op: z.literal("node.delete") }),
            Node.Move.Request.extend({ op: z.literal("node.move") }),
            Edge.Create.Request.extend({ op: z.literal("edge.create") }),
            Edge.Delete.Request.extend({ op: z.literal("edge.delete") }),
            Field.Set.Request.extend({ op: z.literal("field.set") }),
        ])
        export type Operation = z.infer<typeof Operation>

        export namespace Batch {
            export const Request = z.object({ operations: z.array(Operation) })
            export type Request  = z.infer<typeof Request>
            export type Response = { results: unknown[] }

            export async function apply(api: AxiosInstance, workflowId: WorkflowNs.Id, request: Request): Promise<Response> {
                const { data } = await api.post<Response>(`/api/internal/workbench/workflows/${workflowId}/session/batch`, request)
                return data
            }
        }

        // Reads never hold the workflow. Inside a session they see the session's own document;
        // outside one, a snapshot of the row. Writes need an open session held by the caller.

        /** Lock and load. Refused while anyone holds the workflow. */
        export async function beginTransaction(api: AxiosInstance, workflowId: WorkflowNs.Id): Promise<Begin.Response> {
            const { data } = await api.post<Begin.Response>(`/api/internal/workbench/workflows/${workflowId}/session`)
            return data
        }

        export async function heartbeat(api: AxiosInstance, workflowId: WorkflowNs.Id): Promise<void> {
            await api.post(`/api/internal/workbench/workflows/${workflowId}/session/heartbeat`)
        }

        export async function commitTransaction(api: AxiosInstance, workflowId: WorkflowNs.Id): Promise<Commit.Response> {
            const { data } = await api.post<Commit.Response>(`/api/internal/workbench/workflows/${workflowId}/session/commit`)
            return data
        }

        export async function abortTransaction(api: AxiosInstance, workflowId: WorkflowNs.Id): Promise<void> {
            await api.post(`/api/internal/workbench/workflows/${workflowId}/session/abort`)
        }
    }
}
