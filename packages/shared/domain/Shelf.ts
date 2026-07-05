import { z } from "zod"
import type { AxiosInstance } from "axios";
import { Foundations } from "./Foundations";
import { SECTIONS as _SECTIONS, CORE_DRAWERS as _CORE_DRAWERS, BUNDLE_DRAWERS as _BUNDLE_DRAWERS, ALL_DRAWERS as _ALL_DRAWERS, SECTIONS } from "../constants/drawers"

export namespace Shelf {

    export namespace Drawer {
        export const Id = z.string().brand("DrawerId");
        export type Id = z.infer<typeof Id>;
    }


    export namespace Drawer {
        export const Schema = z.object({
            id: Drawer.Id,
            displayName: z.string(),
            icon: z.string(),
            blueprintIds: z.array(Foundations.Blueprint.Id),
            color: z.string().optional()
        })

        export const SECTIONS = _SECTIONS
        export const CORE_DRAWERS = _CORE_DRAWERS
        export const BUNDLE_DRAWERS = _BUNDLE_DRAWERS
        export const ALL_DRAWERS = _ALL_DRAWERS
    }

    export type Drawer = z.infer<typeof Drawer.Schema>

    export namespace Index {
        export const Schema = z.object({
            version: z.string(),
            generatedAt: z.string(),
            drawers: z.record(Drawer.Id, Drawer.Schema),
            blueprints: z.record(Foundations.Blueprint.Id, Foundations.Blueprint.Schema)
        })
    }
    export type Index = z.infer<typeof Index.Schema>

    export const Section = z.enum(["core", "mcp", "bundle"])
    export type Section = z.infer<typeof Section>

    export namespace API {

        export namespace Blueprint {
            export namespace Get {
                export const Request = z.object({
                    blueprintId: Foundations.Blueprint.Id
                })
                export const Response = z.object({
                    blueprint: Foundations.Blueprint.Schema
                })

                export type Request = z.infer<typeof Request>
                export type Response = z.infer<typeof Response>
            }
            export async function get(
                api: AxiosInstance,
                req: Get.Request
            ): Promise<Get.Response> {
                const { data } = await api.post<Get.Response>(
                    '/api/shelf/blueprint/get', req
                );
                return data;
            }

            export namespace GetBatch {
                export const Request = z.object({
                    blueprintIds: z.array(Foundations.Blueprint.Id)
                })
                export const Response = z.object({
                    blueprints: z.record(Foundations.Blueprint.Id, Foundations.Blueprint.Schema)
                })

                export type Request = z.infer<typeof Request>
                export type Response = z.infer<typeof Response>
            }
            export async function getBatch(
                api: AxiosInstance,
                req: GetBatch.Request
            ): Promise<GetBatch.Response> {
                const { data } = await api.post<GetBatch.Response>(
                    '/api/shelf/blueprint/getBatch', req
                )
                return data;
            }

            export namespace GetAllInSection {
                export const Request = z.object({
                    section: Section
                })
                export const Response = z.object({
                    blueprints: z.record(Foundations.Blueprint.Id, Foundations.Blueprint.Schema)
                })

                export type Request = z.infer<typeof Request>
                export type Response = z.infer<typeof Response>
            }
            export async function getAllInSection(
                api: AxiosInstance,
                req: GetAllInSection.Request
            ): Promise<GetAllInSection.Response> {
                const { data } = await api.post<GetAllInSection.Response>(
                    '/api/shelf/blueprint/getAllInSection', req
                )
                return data;
            }

            export namespace Reconcile {
                export const Request = z.object({
                    blueprintId: Foundations.Blueprint.Id,
                    fieldValues: z.record(Foundations.Field.Id, Foundations.Field.Value)
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    reconciledBlueprint: Foundations.Blueprint.Schema
                })
                export type Response = z.infer<typeof Response>
            }
            export async function reconcile(
                api: AxiosInstance,
                req: Reconcile.Request
            ): Promise<Reconcile.Response> {
                const { data } = await api.post<Reconcile.Response>(
                    '/api/shelf/blueprint/reconcile', req
                )
                return data;
            }
        }
    }
}