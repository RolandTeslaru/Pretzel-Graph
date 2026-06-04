import { z } from "zod"
import { Port } from "./Port"
import { Field } from "./Field"
import { Webhook } from "../Webhook"
import { Vault } from "../Vault"
import { extractExposedPorts } from "../../subworkflow"

// ============================================
// BLUEPRINT
// ============================================

export namespace Blueprint {
    export const Id = z.string().brand("BlueprintId")
    export type Id = z.infer<typeof Id>

    export const ReconciledId = z.string().brand("ReconciledBlueprintId")
    export type ReconciledId = z.infer<typeof ReconciledId>

    export const createReconciledId = (
        blueprintId : Blueprint.Id,
        fields      : Field[] | Readonly<Field[]>,
        values      : Record<Field.Id, Field.Value>,
        anticipate? : Partial<Record<Field.Id, Field.Value>>
    ): Blueprint.ReconciledId => {
        const parts = fields
            .filter(f => f.reconcile)
            .map(f => `${f.id}=${String(anticipate?.[f.id] ?? values[f.id] ?? f.initialValue)}`)
            .sort()
            .join(",");

        return `${blueprintId}:${parts}` as Blueprint.ReconciledId;
    }



    export namespace Meta {

        export namespace Dependency {
            export const Schema = z.object({
                workflowId: z.uuid().brand("WorkflowId"),
                mode:       z.enum(["publication", "draft"]),
            })
        }
        export type Dependency = z.infer<typeof Dependency.Schema>

        export const Schema = z.object({
            id:                   Blueprint.Id,
            displayName:          z.string(),
            icon:                 z.string(),
            accent:               z.string().optional(),
            toolCompatible:       z.boolean().optional(),
            description:          z.string().optional(),
            dependency:           Dependency.Schema.optional(),
            flags:                z.record(z.string(), z.unknown()).optional(),
            credentials:          z.array(Vault.Credential.Template.Schema).readonly().optional(),
        })
        
    }
    export type Meta = z.infer<typeof Meta.Schema>

    export const Schema = Meta.Schema.extend({
        fields:   z.array(Field.Schema).readonly(),
        inputs:   z.array(Port.Input.Schema).readonly(),
        outputs:  z.array(Port.Output.Schema).readonly(),
        webhooks: z.array(Webhook.Schema).readonly().optional(),
    }).readonly()


    export const createFromDependency = (dep: {
        workflow_data: any
        display_name: string
        icon?: string | null
        accent?: string | null
    }, baseBlueprint: Blueprint) => {
        return {
            ...baseBlueprint,
            ...extractExposedPorts(dep.workflow_data),
            fields:      mergeFieldsById(baseBlueprint.fields, dep.workflow_data.fields ?? []),
            displayName: dep.display_name,
            icon:        dep.icon ?? baseBlueprint.icon,
            accent:      dep.accent ?? baseBlueprint.accent,
        } satisfies Blueprint
    }
}
export type Blueprint = z.infer<typeof Blueprint.Schema>


function mergeFieldsById(
    baseFields: readonly Field[],
    depFields:  readonly Field[],
): Field[] {
    const map = new Map<Field.Id, Field>()
    for (const f of baseFields) map.set(f.id, f)
    for (const f of depFields) if (!map.has(f.id)) map.set(f.id, f)
    return [...map.values()]
}
