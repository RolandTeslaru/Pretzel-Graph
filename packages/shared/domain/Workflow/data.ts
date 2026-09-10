import { z } from "zod"
import { Field } from "../Foundations/Field";
import { Node } from "./node";
import { Edge } from "./edge";
import { Port } from "../Foundations/Port";
import { WorkflowId } from "./ids";
import { Vault } from "../Vault";
import { Dependency } from "./dependency";
import { Annotation } from "../Annotation";
import { migrateWorkflowDataToLatest, WORKFLOW_DATA_VERSION } from "./migrate";

export namespace Data {
    export namespace Layout {
        export const Schema = z.record(
            Node.Id,
            z.object({
                x: z.number(),
                y: z.number(),
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

    const ObjectSchema = z.object({
        version: z.number().default(WORKFLOW_DATA_VERSION),
        // The workflow's own inputs: shown on its sub-workflow node, read inside as $globalFields.
        globalFields: z.array(Field.Schema).default([]),
        nodes: z.record(Node.Id, Node.Raw.Schema),
        // Id-only: an edge id fully encodes its endpoints (source|port|target|port), so the fat
        // {source, target} form is derived into the cache on read. Migrated from the legacy record.
        edges: z.array(Edge.Id),
        staticValues: z.record(
            Node.Id,
            z.record(
                z.union([Field.Id, Port.Input.Id]),
                z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.json()])
            )
        ),
        // Per-node override of a field's static/expression mode — the user's Static/Expression
        // toggle. Absent means "no choice made": fall back to the blueprint's
        // `isExpressionInitially`. Resolved through Field.usesExpression, never read directly.
        fieldExpressions: z.record(
            Node.Id,
            z.record(Field.Id, z.boolean())
        ).default({}),

        credentialInstanceIds: z.record(
            Node.Id,
            z.record(Vault.Credential.Template.Id, Vault.Credential.Instance.Id)
        ).default({}),

        // Editor-only layout/viewport. Dropped from dependency snapshots (executed, not rendered),
        // so it must default when absent.
        ui: z.object({
            layout: Layout.Schema,
            viewport: Viewport.Schema,
            icon_color: z.string().nullable().optional(),
            annotations: z.record(Annotation.Id, Annotation.Schema).default({}),
        }).default({ layout: {}, viewport: { x: 0, y: 0, zoom: 1 }, annotations: {} }),

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

    // Migrate legacy (fat-node) blobs to the latest slim shape before validation. The migrate
    // fn sees the raw object, so v1 ports/fields survive long enough to be relocated/dropped.
    export const Schema = z.preprocess(migrateWorkflowDataToLatest, ObjectSchema);
}
export type Data = z.infer<typeof Data.Schema>;