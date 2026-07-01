import { z } from "zod"
import { Blueprint } from "../Foundations/Blueprint";
import { Field } from "../Foundations/Field";
import { Port } from "../Foundations/Port";
import { Webhook } from "../Webhook";
import { NodeId } from "./ids";

export namespace Node {
    export const Id = NodeId;
    export type Id = NodeId;

    export namespace Dependency {
        export const Schema = Blueprint.Meta.Dependency.Schema
    }
    export type Dependency = z.infer<typeof Dependency.Schema>

    export const Schema = Blueprint.Meta.Schema.extend({
        id: Node.Id,
        blueprintId: z.string().brand("BlueprintId"),

        fields: z.array(Field.Schema),
        inputs: z.array(Port.Input.Schema),
        outputs: z.array(Port.Output.Schema),
        webhooks: z.array(Webhook.Schema).optional(),
        itemScope: z.string().optional(),  // input port id iterated for item-scoped fields

        isMinimized: z.boolean().default(false),
        isFlipped: z.boolean().optional(),
        isDisabled: z.boolean().optional(),
        // iconColor (per-node accent-token override) is inherited from Blueprint.Meta.
    });

    export function createId(blueprintId: Blueprint.Id) {
        return `${blueprintId}-${uid.randomUUID(5)}` as Node.Id
    }
}
export interface Node extends z.infer<typeof Node.Schema> { }


const uid = {
    randomUUID: (length: number) => Math.random().toString(36).substring(2, 2 + length)
}
