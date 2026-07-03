import { z } from "zod"
import { Blueprint } from "../Foundations/Blueprint";
import { Field } from "../Foundations/Field";
import { Port } from "../Foundations/Port";
import { Webhook } from "../Webhook";
import { NodeId } from "./ids";
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
        displayName: z.string().optional(),
        description: z.string().optional(),
        isDisabled:  z.boolean().optional(),
        dependency:  Blueprint.Meta.Dependency.Schema.optional(),
        
        reconciledBlueprintId: Blueprint.ReconciledId.optional(),

        polymorphicResolutions: z.record(Port.PolymorphicGroupId, Port.Variant).optional(),
        variadicCounts:         z.record(Port.GroupId, z.number()).optional(),

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
            fields: z.array(Field.Schema),
            inputs: z.array(Port.Input.Schema),
            outputs: z.array(Port.Output.Schema),
            webhooks: z.array(Webhook.Schema).optional(),
        })
}
export type HydratedNode = z.infer<typeof HydratedNode.Schema>