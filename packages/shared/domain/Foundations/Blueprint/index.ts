import { z } from "zod"
import { Port } from "../Port"
import { Field } from "../Field"
import { Webhook } from "../../Webhook"
import { Vault } from "../../Vault"
import * as DerivativeMod from "./derivative"

// ============================================
// BLUEPRINT
// ============================================

export namespace Blueprint {
    export const Id = z.string().brand("BlueprintId")
    export type Id = z.infer<typeof Id>

    export const ReconciledId = Blueprint.Id.brand("ReconciledId")
    export type ReconciledId = z.infer<typeof ReconciledId>

    export namespace ResolutionFailure {
        export const MissingBlueprint = z.object({
            code:        z.literal("MISSING_BLUEPRINT"),
            blueprintId: Blueprint.Id,
        })
        export type MissingBlueprint = z.infer<typeof MissingBlueprint>

        export const MissingDerivative = z.object({
            code:                  z.literal("MISSING_BLUEPRINT_DERIVATIVE"),
            blueprintId:           Blueprint.Id,
            reconciledBlueprintId: Blueprint.ReconciledId,
            derivativePath:        z.string(),
        })
        export type MissingDerivative = z.infer<typeof MissingDerivative>

        export const Schema = z.discriminatedUnion("code", [
            MissingBlueprint,
            MissingDerivative,
        ])
    }
    export type ResolutionFailure = z.infer<typeof ResolutionFailure.Schema>

    export import Derivative = DerivativeMod.Derivative

    // Folds `_derivatives` against a node's field values. Shared so the editor and the
    // execution path produce byte-identical results — the editor no longer round-trips.
    export const derive       = DerivativeMod.derive
    export const deriveByPath = DerivativeMod.deriveByPath

    /**
     * Identity for a node's resolved derivative. Static blueprints keep their base id; derivative
     * blueprints key on the matched path (`Blueprint.Id:shape==number/rounding!=none`).
     */
    export const deriveId = (
        blueprint   : Blueprint,
        fieldValues : Record<Field.Id, Field.Value>,
    ): Blueprint.ReconciledId => {
        if (!blueprint._derivatives?.length)
            return blueprint.id as Blueprint.ReconciledId;

        const { derivativeId } = derive(blueprint, fieldValues);

        return (derivativeId ? `${blueprint.id}:${derivativeId}` : blueprint.id) as Blueprint.ReconciledId;
    }

    // Resolved derivative ids are `${blueprintId}:${derivativePath}`. Base ids never contain a colon.
    export const isReconciledId = (id: string): id is Blueprint.ReconciledId => id.includes(":");

    export const extractBlueprintId = (id: Blueprint.ReconciledId | string): Blueprint.Id =>
        id.split(":")[0] as Blueprint.Id;

    export namespace Meta {

        export namespace DependencyRef {
            export const Schema = z.object({
                workflowId: z.uuid().brand("WorkflowId"),
                mode:       z.enum(["publication", "draft"]),
            })
        }
        export type DependencyRef = z.infer<typeof DependencyRef.Schema>

        export const Schema = z.object({
            id:                   Blueprint.Id,
            toolCompatible:       z.boolean().optional(),
            // Node routes its outbound HTTP through RuntimeNode.httpClientFactory, so an
            // attached networkProxy credential actually applies. Absent/false => no proxy slot.
            proxyCompatible:      z.boolean().optional(),
            // Node is a trigger: it never self-starts, and a run has to elect it by id
            // (Execution.Igniter "workbench_igniter"). The editor marks these on canvas.
            igniter:              z.boolean().optional(),
            // Node never self-starts and is never electable either — it only fires when
            // another node triggers it mid-run via schedulerAPI/propagationAPI.
            passive:              z.boolean().optional(),
            dependencyRef:        DependencyRef.Schema.optional(),
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
        // Conditional structure, folded by Blueprint.derive. Present on base blueprints only —
        // derive() strips it, so a derived blueprint can never be derived twice.
        _derivatives: z.array(DerivativeMod.Derivative.Schema).readonly().optional(),
    }).readonly()
}
export type Blueprint = z.infer<typeof Blueprint.Schema>
