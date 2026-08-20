"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const zod_1 = require("zod");
const Port_1 = require("../Port");
const Field_1 = require("../Field");
const Webhook_1 = require("../../Webhook");
const Vault_1 = require("../../Vault");
const DerivativeMod = __importStar(require("./derivative"));
// ============================================
// BLUEPRINT
// ============================================
var Blueprint;
(function (Blueprint) {
    Blueprint.Id = zod_1.z.string().brand("BlueprintId");
    Blueprint.ReconciledId = Blueprint.Id.brand("ReconciledId");
    let ResolutionFailure;
    (function (ResolutionFailure) {
        ResolutionFailure.MissingBlueprint = zod_1.z.object({
            code: zod_1.z.literal("MISSING_BLUEPRINT"),
            blueprintId: Blueprint.Id,
        });
        ResolutionFailure.MissingDerivative = zod_1.z.object({
            code: zod_1.z.literal("MISSING_BLUEPRINT_DERIVATIVE"),
            blueprintId: Blueprint.Id,
            reconciledBlueprintId: Blueprint.ReconciledId,
            derivativePath: zod_1.z.string(),
        });
        ResolutionFailure.Schema = zod_1.z.discriminatedUnion("code", [
            ResolutionFailure.MissingBlueprint,
            ResolutionFailure.MissingDerivative,
        ]);
    })(ResolutionFailure = Blueprint.ResolutionFailure || (Blueprint.ResolutionFailure = {}));
    Blueprint.Derivative = DerivativeMod.Derivative;
    // Folds `_derivatives` against a node's field values. Shared so the editor and the
    // execution path produce byte-identical results — the editor no longer round-trips.
    Blueprint.derive = DerivativeMod.derive;
    Blueprint.deriveByPath = DerivativeMod.deriveByPath;
    /**
     * Identity for a node's resolved derivative. Static blueprints keep their base id; derivative
     * blueprints key on the matched path (`Blueprint.Id:shape==number/rounding!=none`).
     */
    Blueprint.deriveId = (blueprint, fieldValues) => {
        if (!blueprint._derivatives?.length)
            return blueprint.id;
        const { derivativeId } = Blueprint.derive(blueprint, fieldValues);
        return (derivativeId ? `${blueprint.id}:${derivativeId}` : blueprint.id);
    };
    // Resolved derivative ids are `${blueprintId}:${derivativePath}`. Base ids never contain a colon.
    Blueprint.isReconciledId = (id) => id.includes(":");
    Blueprint.extractBlueprintId = (id) => id.split(":")[0];
    let Meta;
    (function (Meta) {
        let DependencyRef;
        (function (DependencyRef) {
            DependencyRef.Schema = zod_1.z.object({
                workflowId: zod_1.z.uuid().brand("WorkflowId"),
                mode: zod_1.z.enum(["publication", "draft"]),
            });
        })(DependencyRef = Meta.DependencyRef || (Meta.DependencyRef = {}));
        Meta.Schema = zod_1.z.object({
            id: Blueprint.Id,
            toolCompatible: zod_1.z.boolean().optional(),
            // Node routes its outbound HTTP through RuntimeNode.httpClientFactory, so an
            // attached networkProxy credential actually applies. Absent/false => no proxy slot.
            proxyCompatible: zod_1.z.boolean().optional(),
            // Node is a trigger: it never self-starts, and a run has to elect it by id
            // (Execution.Igniter "workbench_igniter"). The editor marks these on canvas.
            igniter: zod_1.z.boolean().optional(),
            // Node never self-starts and is never electable either — it only fires when
            // another node triggers it mid-run via schedulerAPI/propagationAPI.
            passive: zod_1.z.boolean().optional(),
            dependencyRef: DependencyRef.Schema.optional(),
            flags: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
            credentials: zod_1.z.array(Vault_1.Vault.Credential.Template.Schema).readonly().optional(),
            ui: zod_1.z.object({
                displayName: zod_1.z.string(),
                description: zod_1.z.string().optional(),
                icon: zod_1.z.string(),
                accent: zod_1.z.string().optional(),
                iconColor: zod_1.z.string().optional(),
            }),
        });
    })(Meta = Blueprint.Meta || (Blueprint.Meta = {}));
    Blueprint.Schema = Meta.Schema.extend({
        fields: zod_1.z.array(Field_1.Field.Schema).readonly(),
        inputs: zod_1.z.array(Port_1.Port.Input.Schema).readonly(),
        outputs: zod_1.z.array(Port_1.Port.Output.Schema).readonly(),
        webhooks: zod_1.z.array(Webhook_1.Webhook.Schema).readonly().optional(),
        // Input port id whose array is iterated for this node's item-scoped fields.
        itemScope: zod_1.z.string().optional(),
        // Conditional structure, folded by Blueprint.derive. Present on base blueprints only —
        // derive() strips it, so a derived blueprint can never be derived twice.
        _derivatives: zod_1.z.array(DerivativeMod.Derivative.Schema).readonly().optional(),
    }).readonly();
})(Blueprint || (exports.Blueprint = Blueprint = {}));
