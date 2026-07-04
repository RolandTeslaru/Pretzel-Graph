import { z } from "zod"
import { Blueprint } from "../Foundations/Blueprint";
import { Field } from "../Foundations/Field";
import { Port } from "../Foundations/Port";
import { Webhook } from "../Webhook";
import { NodeId, EdgeId } from "./ids";
import { Dependency } from "./dependency";

export namespace Node {
    export const Id = NodeId;
    export type Id = NodeId;

    export namespace Dependency {
        export const Schema = Blueprint.Meta.Dependency.Schema
    }
    export type Dependency = z.infer<typeof Dependency.Schema>

    export const Schema = z.object({
        id:          Node.Id,
        blueprintId: z.string().brand("BlueprintId"),
        isDisabled:  z.boolean().optional(),
        dependency:  Blueprint.Meta.Dependency.Schema.optional(),
        
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
    })

    export function createId(blueprintId: Blueprint.Id) {
        return `${blueprintId}-${uid.randomUUID(5)}` as Node.Id
    }
}
export interface Node extends z.infer<typeof Node.Schema> { }


const uid = {
    randomUUID: (length: number) => Math.random().toString(36).substring(2, 2 + length)
}

export namespace HydratedNode {
    export const Schema = Blueprint.Meta.Schema
        .extend(Node.Schema.omit({ addedInputs: true, addedOutputs: true }).shape)
        .extend({
            blueprint: Blueprint.Schema,
            inputs: z.array(Port.Input.Schema),
            outputs: z.array(Port.Output.Schema),
            connectedPorts: z.record(Port.Input.Id, EdgeId),
        })
}
export type HydratedNode = z.infer<typeof HydratedNode.Schema>