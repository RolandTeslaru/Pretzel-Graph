import { z } from "zod"
import { Blueprint } from "../Foundations/Blueprint";
import { Field } from "../Foundations/Field";
import { Port } from "../Foundations/Port";
import { Webhook } from "../Webhook";
import { NodeId, EdgeId } from "./ids";
import { Dependency } from "./dependency";
import { resolveInputs as _resolveInputs, resolveOutputs as _resolveOutputs } from "./resolvers";

export namespace Node {
    export const Id = NodeId;
    export type Id = NodeId;

    export namespace DependencyRef {
        export const Schema = Blueprint.Meta.DependencyRef.Schema
    }
    export type DependencyRef = z.infer<typeof DependencyRef.Schema>

    // The slim, persisted node — what lives in `data.nodes` and the store.
    export namespace Raw {
        export const Schema = z.object({
            id:          Node.Id,
            blueprintId: z.string().brand("BlueprintId"),
            isDisabled:  z.boolean().optional(),
            dependencyRef: Blueprint.Meta.DependencyRef.Schema.optional(),

            // Per-node presentation: view-state (minimized/flipped) + optional overrides of the
            // blueprint's ui (icon/accent/iconColor). All derived-on-read via node.getUI.
            ui: z.object({
                description: z.string().optional(),
                displayName: z.string().optional(),
                isMinimized: z.boolean().optional(),
                isFlipped:   z.boolean().optional(),
                icon:        z.string().optional(),
                accent:      z.string().optional(),
                iconColor:   z.string().optional(),
            }).default({}),

            reconciledBlueprintId: Blueprint.ReconciledId.optional(),

            polymorphicResolutions: z.record(Port.PolymorphicGroupId, Port.Variant).optional(),

            addedInputs: z.array(Port.Input.Schema).optional(),
            addedOutputs: z.array(Port.Output.Schema).optional(),
            addedFields: z.array(Field.Schema).optional(),
        })
    }
    export interface Raw extends z.infer<typeof Raw.Schema> { }

    // The read-time rich view — raw node + blueprint + resolved ports/fields. Never persisted.
    // Blueprint-level properties are NOT flattened in: read them off `.blueprint`, which is the
    // whole thing. (`dependencyRef`, `id` and `ui` live on Raw, so they stay on the node.)
    export namespace Hydrated {
        export const Schema = Raw.Schema
            .omit({ addedInputs: true, addedOutputs: true, addedFields: true })
            .extend({
                blueprint: Blueprint.Schema,
                fields: z.array(Field.Schema),
                inputs: z.array(Port.Input.Schema),
                outputs: z.array(Port.Output.Schema),
                connectedPorts: z.record(Port.Input.Id, EdgeId),
            })
    }
    export type Hydrated = z.infer<typeof Hydrated.Schema>

    export function createId(blueprintId: Blueprint.Id) {
        return `${blueprintId}-${uid.randomUUID(5)}` as Node.Id
    }

    // Live port resolution for a slim node (base blueprint ports + resolutions, or a
    // subworkflow's exposed ports when a dependency is passed). Impl in ./resolvers.
    export const resolveInputs  = _resolveInputs
    export const resolveOutputs = _resolveOutputs
}


const uid = {
    randomUUID: (length: number) => Math.random().toString(36).substring(2, 2 + length)
}