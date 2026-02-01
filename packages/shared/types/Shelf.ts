import { z } from "zod"
import { Workflow } from "./Workflow";


export namespace Shelf {

    export namespace Drawer {
        export const Id = z.string().brand("DrawerId");
        export type Id = z.infer<typeof Id>;
    }

    export namespace Blueprint {
        export const Id = z.string().brand("BlueprintId");
        export type Id = z.infer<typeof Id>;
    }

    export namespace Drawer {
        export const Schema = z.object({
            id: Drawer.Id,
            display_name: z.string(),
            icon: z.string(),
            blueprints: z.array(Blueprint.Id).optional(),
        })
    }


    export namespace Blueprint {
        export const VersionId = z.string().brand("NodeVersionId")
        export type VersionId = z.infer<typeof VersionId>

        export const Schema = z.object({
            id: Blueprint.Id,
            versionId: VersionId,
            legacy_id: z.string().optional(),
            drawer_id: Drawer.Id,

            display_name: z.string(),
            description: z.string(),

            created_at: z.iso.datetime(),
            updated_at: z.iso.datetime(),

            data: z.object({
                inputs: z.record(Workflow.Node.Input.Id, Workflow.Node.Input.Schema),
                outputs: z.record(Workflow.Node.Output.Id, Workflow.Node.Output.Schema),

                ui: z.object({
                    icon: z.string(),
                    icon_color: z.string(),
                    normalInputsOrder: z.array(Workflow.Node.Input.Id),
                    advancedInputsOrder: z.array(Workflow.Node.Input.Id),
                })
            })
        })

        export namespace Meta {
            export const Schema = Blueprint.Schema.omit({ data: true })
        }
        export type Meta = z.infer<typeof Blueprint.Meta.Schema>
    }
    export type Blueprint = z.infer<typeof Blueprint.Schema>


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
            }

            export namespace GetAllIds {
                export const Request = z.object({})

                export const Response = z.object({
                    drawerIds: z.array(Shelf.Drawer.Id)
                })
            }
        }

        export namespace Blueprint {
            export namespace Get {
                export const Request = z.object({
                    id: Shelf.Blueprint.Id,
                })

                export const Response = Shelf.Blueprint.Schema;
            }

            export namespace List {
                export const Request = z.object({
                    drawerId: z.string().optional()
                });
                // Returns array of Meta (lighter payload) or full blueprints
                export const ResponseSchema = z.array(Shelf.Blueprint.Schema);
                export type Response = z.infer<typeof ResponseSchema>;
            }

            export namespace Create {
                // We accept a full Blueprint object
                export const Request = Shelf.Blueprint.Schema;
                export type Request = z.infer<typeof Request>;
                export type Response = Shelf.Blueprint;
            }

            export namespace Update {
                export const Request = Shelf.Blueprint.Schema;
                export type Request = z.infer<typeof Request>;
                export type Response = Shelf.Blueprint;
            }
        }
    }
}