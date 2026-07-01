import { z } from "zod"
import { Field } from "../Foundations/Field";
import { Node } from "./node";
import { Edge } from "./edge";
import { Port } from "../Foundations/Port";
import { WorkflowId } from "./ids";
import { Vault } from "../Vault";
import { Dependency } from "./dependency";

export namespace Data {
    export namespace Layout {
        export const Schema = z.record(
            Node.Id,
            z.object({
                x: z.number(),
                y: z.number()
            })
        );
    }
    export type Layout = z.infer<typeof Layout.Schema>;

    export namespace Viewport {
        export const Schema = z.object({
            x: z.number(),
            y: z.number(),
            zoom: z.number(),
        });
    }
    export type Viewport = z.infer<typeof Viewport.Schema>;

    export const Schema = z.object({
        fields: z.array(Field.Schema).default([]), //config
        nodes: z.record(Node.Id, Node.Schema),
        edges: z.record(Edge.Id, Edge.Schema),
        staticValues: z.record(
            Node.Id,
            z.record(
                z.union([Field.Id, Port.Input.Id]),
                z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.json()])
            )
        ),
        credentialInstanceIds: z.record(
            Node.Id,
            z.record(Vault.Credential.Template.Id, Vault.Credential.Instance.Id)
        ).default({}),

        ui: z.object({
            layout: Layout.Schema,
            viewport: Viewport.Schema,
            icon_color: z.string().nullable().optional(),
        }),

        // Getters defer the Dependency <-> Data cycle; the z.ZodType anchors
        // are required because TS can't infer through mutual recursion.
        dependencies: z.object({
            get published(): z.ZodType<Record<WorkflowId, Dependency.Publication>> {
                return z.record(WorkflowId, Dependency.Publication.Schema).default({});
            },
            get draft(): z.ZodType<Record<WorkflowId, Dependency.Draft>> {
                return z.record(WorkflowId, Dependency.Draft.Schema).default({});
            },
        }).default({ published: {}, draft: {} }),
    })
}
export type Data = z.infer<typeof Data.Schema>;