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

    export const ReconciledId = Blueprint.Id.brand("ReconciledId")
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

    // Reconciled ids are `${blueprintId}:${field=value,...}`. Base ids never contain a colon.
    export const isReconciledId = (id: string): id is Blueprint.ReconciledId => id.includes(":");

    export const extractBlueprintId = (id: Blueprint.ReconciledId | string): Blueprint.Id =>
        id.split(":")[0] as Blueprint.Id;

    export const parseReconciledId = (id: Blueprint.ReconciledId | string): {
        blueprintId: Blueprint.Id;
        fieldValues: Record<Field.Id, Field.Value>;
    } => {
        const [blueprintId, parts] = id.split(":") as [Blueprint.Id, string | undefined];
        const fieldValues: Record<Field.Id, Field.Value> = {};
        if (parts)
            for (const pair of parts.split(",")) {
                const eq = pair.indexOf("=");
                if (eq === -1) continue;
                fieldValues[pair.slice(0, eq) as Field.Id] = pair.slice(eq + 1);
            }
        return { blueprintId, fieldValues };
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
            toolCompatible:       z.boolean().optional(),
            dependency:           Dependency.Schema.optional(),
            flags:                z.record(z.string(), z.unknown()).optional(),
            credentials:          z.array(Vault.Credential.Template.Schema).readonly().optional(),
            
            ui:                   z.object({                
                displayName:          z.string(),
                description:          z.string().optional(),
                icon:                 z.string(),
                accent:               z.string().optional(),
                iconColor:            z.string().optional(),
            }),
        })
        
    }
    export type Meta = z.infer<typeof Meta.Schema>

    export const Schema = Meta.Schema.extend({
        fields:    z.array(Field.Schema).readonly(),
        inputs:    z.array(Port.Input.Schema).readonly(),
        outputs:   z.array(Port.Output.Schema).readonly(),
        webhooks:  z.array(Webhook.Schema).readonly().optional(),
        // Input port id whose array is iterated for this node's item-scoped fields.
        itemScope: z.string().optional(),
    }).readonly()


    export const createFromDependency = (dep: {
        workflow_data: any
        display_name: string
        icon?: string | null
        accent?: string | null
        iconColor?: string | null
    }, baseBlueprint: Blueprint) => {
        return {
            ...baseBlueprint,
            ...extractExposedPorts(dep.workflow_data),
            fields:      mergeFieldsById(baseBlueprint.fields, dep.workflow_data.fields ?? []),
            ui: {
                displayName: dep.display_name,
                icon:        dep.icon ?? baseBlueprint.ui.icon,
                accent:      dep.accent ?? baseBlueprint.ui.accent,
                // Don't inherit the container's iconColor — a dependency has its own
                // visual identity (icon/accent). Only use one the dependency declares.
                iconColor:   dep.iconColor ?? undefined,
            },
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
