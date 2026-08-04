import { z } from "zod"
import { PublicationId, WorkflowId } from "./ids";
import { Data } from "./data";

export namespace Dependency {
    // Hand-written anchors: TS cannot infer the Data <-> Dependency cycle.
    // Merged with the namespaces below so `Dependency.Publication` is this type.
    //
    // Purpose-built dependency snapshot — deliberately NOT derived from the
    // version-control publication (they diverge); carries only what a depending
    // workflow needs to render and detect updates.
    export interface Publication {
        id: PublicationId;
        workflow_id: WorkflowId;
        version: number;
        workflow_data: Data;
        published_at: Date;
        publication_name: string;
        display_name: string;
        icon?: string | null;
        accent?: string | null;
    }
    export namespace Publication {
        export const Id = PublicationId;
        export type Id = PublicationId;

        export const Schema = z.object({
            id: PublicationId,
            workflow_id: WorkflowId,
            version: z.number(),
            get workflow_data() { return Data.Schema; },
            published_at: z.coerce.date(),
            publication_name: z.string(),
            display_name: z.string(),
            icon: z.string().nullable().optional(),
            accent: z.string().nullable().optional(),
        });

        export const UpdateInfo = z.object({
            workflowId: WorkflowId,
            publicationId: PublicationId,
            version: z.number(),
            name: z.string(),
            description: z.string().nullable(),
        })
        export type UpdateInfo = z.infer<typeof UpdateInfo>
    }

    export interface Draft {
        workflow_id: WorkflowId;
        workflow_data: Data;
        display_name: string;
        icon?: string | null;
        accent?: string | null;
        workflow_updated_at: Date;
    }
    export namespace Draft {
        export const Schema = z.object({
            workflow_id: WorkflowId,
            get workflow_data() { return Data.Schema; },
            display_name: z.string(),
            icon: z.string().nullable().optional(),
            accent: z.string().nullable().optional(),
            workflow_updated_at: z.coerce.date(),
        });

        export const UpdateInfo = z.object({
            workflowId: WorkflowId,
            workflow_updated_at: z.coerce.date(),
        });
        export type UpdateInfo = z.infer<typeof UpdateInfo>;
    }

    export const Schema = z.union([Publication.Schema, Draft.Schema])

    export const Variant = z.enum(["draft", "publication"])
    export type Variant = z.infer<typeof Variant>
}
export type Dependency = z.infer<typeof Dependency.Schema>
