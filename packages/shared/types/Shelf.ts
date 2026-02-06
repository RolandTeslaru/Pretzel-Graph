import { z } from "zod"
import { Workflow } from "./Workflow";
import { Foundations } from "./Foundations";


export namespace Shelf {

    export namespace Drawer {
        export const Id = z.string().brand("DrawerId");
        export type Id = z.infer<typeof Id>;
    }


    export namespace Drawer {
        export const Schema = z.object({
            id: Drawer.Id,
            display_name: z.string(),
            icon: z.string(),
            blueprints: z.array(Workflow.Node.Id).optional(),
        })
    }

    export type Drawer = z.infer<typeof Drawer.Schema>




    export namespace API {
        export namespace Drawer {
            export namespace Get {
                export const Request = z.object({
                    id: Shelf.Drawer.Id,
                })
                export const Response = z.object({
                    drawers: z.record(Shelf.Drawer.Id, Shelf.Drawer.Schema),
                })

                export type Request = z.infer<typeof Drawer.Get.Request>
                export type Response = z.infer<typeof Drawer.Get.Response>
            }

            export namespace GetAllIds {
                export const Request = z.object({})
                export const Response = z.object({
                    drawerIds: z.array(Shelf.Drawer.Id)
                })
                export type Request = z.infer<typeof Drawer.Get.Request>
                export type Response = z.infer<typeof Drawer.Get.Response>
            }
        }

        export namespace Node {
            export namespace Get {
                export const Request = z.object({
                    definitionId: Foundations.NodeDefinition.Id,
                })
                export const Response = Workflow.Node;
                
                export type Request = z.infer<typeof API.Node.Get.Request>
                export type Response = z.infer<typeof API.Node.Get.Response>
            }

            export namespace List {
                export const Request = z.object({
                    drawerId: z.string().optional()
                });
                // Returns array of Meta (lighter payload) or full blueprints
                export const Response = z.array(Workflow.Node.Schema);
                
                export type Request = z.infer<typeof API.Node.List.Request>
                export type Response = z.infer<typeof API.Node.List.Response>;
            }
        }
    }
}