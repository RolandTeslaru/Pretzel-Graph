import { z } from "zod"
import { Foundations } from "./Foundations";
import { SECTIONS as _SECTIONS, CORE_DRAWERS as _CORE_DRAWERS, BUNDLE_DRAWERS as _BUNDLE_DRAWERS, ALL_DRAWERS as _ALL_DRAWERS } from "../constants/drawers"

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
            definitionIds: z.array(Foundations.NodeDefinition.Id),
        })

        export const SECTIONS = _SECTIONS
        export const CORE_DRAWERS = _CORE_DRAWERS
        export const BUNDLE_DRAWERS = _BUNDLE_DRAWERS
        export const ALL_DRAWERS = _ALL_DRAWERS
    }

    export type Drawer = z.infer<typeof Drawer.Schema>


    export namespace NodeMeta {
        export const Schema = z.object({
            definitionId: Foundations.NodeDefinition.Id,
            displayName: z.string(),
            icon: z.string(),
            drawerId: Drawer.Id
        })
    }
    export type NodeMeta = z.infer<typeof NodeMeta.Schema>


    export namespace API {
        /**
         * Get the full index (metas + drawer → definitionIds mapping)
         * Called on page mount
         */
        export namespace Index {
            export namespace Get {
                export const Request = z.object({})
                export const Response = z.object({
                    version: z.string(),
                    generatedAt: z.string(),
                    drawers: z.record(Shelf.Drawer.Id, Shelf.Drawer.Schema),
                    nodeDefinitionMetas: z.record(Foundations.NodeDefinition.Id, Shelf.NodeMeta.Schema)
                })

                export type Request = z.infer<typeof Request>
                export type Response = z.infer<typeof Response>
            }
        }

        /**
         * Get full node definitions for a specific drawer
         * Called when user opens a drawer
         */
        export namespace Drawer {
            export namespace GetDefinitions {
                export const Request = z.object({
                    drawerId: Shelf.Drawer.Id,
                })
                export const Response = z.object({
                    definitions: z.array(Foundations.NodeDefinition.Schema)
                })

                export type Request = z.infer<typeof Request>
                export type Response = z.infer<typeof Response>
            }
        }

        /**
         * Get a single full node definition
         * Called when user drags a node (if not already cached)
         */
        export namespace Node {
            export namespace Get {
                export const Request = z.object({
                    definitionId: Foundations.NodeDefinition.Id
                })
                export const Response = Foundations.NodeDefinition.Schema

                export type Request = z.infer<typeof Request>
                export type Response = z.infer<typeof Response>
            }

            export namespace Batch {
                export const Request = z.object({
                    definitionIds: z.array(Foundations.NodeDefinition.Id)
                })
                export const Response = z.object({
                    definitions: z.array(Foundations.NodeDefinition.Schema)
                })

                export type Request = z.infer<typeof Request>
                export type Response = z.infer<typeof Response>
            }
        }
    }
}