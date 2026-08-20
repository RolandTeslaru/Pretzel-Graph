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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Webhook = void 0;
const zod_1 = __importDefault(require("zod"));
const ids_1 = require("./Workflow/ids");
const ids_2 = require("./Execution/ids");
const ExecutionEvent = __importStar(require("./Execution/event-base"));
const Consultation_1 = require("./Consultation");
const Vault_1 = require("./Vault");
var Webhook;
(function (Webhook) {
    Webhook.Id = zod_1.default.string().brand("WebhookId");
    Webhook.WorkflowId = zod_1.default.uuid().brand("WorkflowId");
    Webhook.Path = zod_1.default.string().brand("WebhookPath");
    Webhook.RouteId = zod_1.default.string().brand("WebhookRouteId");
    Webhook.createId = (workflowId, path) => `${workflowId}/${path}`;
    /**
     * Backend → webhook-server shared secret. The webhook server is internet-facing,
     * so its control routes need a caller check; the backend is a trusted holder, so
     * a shared secret is the right weight (unlike Execution.Token, which travels to
     * the worker and is therefore signed).
     *
     * Node lowercases inbound header names — set and read with this exact value.
     */
    Webhook.BACKEND_TOKEN_HEADER = "backend-service-token";
    Webhook.Method = zod_1.default.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]);
    Webhook.ResponseMode = zod_1.default.enum(["onReceived", "workflowCompletion", "manual"]);
    Webhook.Schema = zod_1.default.object({
        id: Webhook.Id,
        method: zod_1.default.string(),
        path: zod_1.default.string(),
        responseMode: zod_1.default.string(),
        // Signing-secret credential for verifying inbound requests. Optional — most webhooks
        // are unauthenticated; the template rides along so the registry/editor can resolve
        // the bound instance.
        credential: Vault_1.Vault.Credential.Template.Schema.optional(),
    });
    Webhook.ResolvedSchema = zod_1.default.object({
        id: Webhook.Id,
        method: Webhook.Method,
        path: Webhook.Path,
        responseMode: Webhook.ResponseMode,
    });
    let Payload;
    (function (Payload) {
        Payload.Schema = zod_1.default.object({
            method: Webhook.Method,
            path: Webhook.Path,
            headers: zod_1.default.record(zod_1.default.string(), zod_1.default.unknown()),
            query: zod_1.default.record(zod_1.default.string(), zod_1.default.unknown()),
            body: zod_1.default.unknown(),
        });
    })(Payload = Webhook.Payload || (Webhook.Payload = {}));
    // ─────────────────────────────────────────────────────────
    // Test — in-editor webhook testing without publishing
    // ─────────────────────────────────────────────────────────
    let Test;
    (function (Test) {
        let Event;
        (function (Event) {
            const Base = ExecutionEvent.Base.extend({
                ignitedNodeId: ids_1.NodeId
            });
            Event.ReadyToReceive = Base.extend({
                type: zod_1.default.literal("webhook-test:ready-to-receive"),
                createdAt: zod_1.default.number(),
                timeout: zod_1.default.number()
            });
            Event.Schema = zod_1.default.discriminatedUnion("type", [Event.ReadyToReceive]);
            Event.create = ExecutionEvent.defineEventFactory(Event.Schema);
        })(Event = Test.Event || (Test.Event = {}));
        let Consultation;
        (function (Consultation) {
            // Namespaced: ConsultationModule.Variant is an open registry shared with every
            // other consulting node, so a bare tag would be free to collide. Pinned as a
            // literal on both schemas so parse rejects a mismatched variant.
            Consultation.Variant = Consultation_1.Consultation.variant("webhook:payload");
            Consultation.Request = Consultation_1.Consultation.Request.extend({
                variant: zod_1.default.literal(Consultation.Variant),
                path: Webhook.Path,
                method: Webhook.Method,
            });
            // path/method aren't echoed back — they're already on the request, and the
            // consultation id is what correlates the two.
            Consultation.Answer = Consultation_1.Consultation.Answer.extend({
                variant: zod_1.default.literal(Consultation.Variant),
                payload: Webhook.Payload.Schema,
            });
        })(Consultation = Test.Consultation || (Test.Consultation = {}));
        let API;
        (function (API) {
            let Register;
            (function (Register) {
                // Sent by the caller; workflowId rides the URL, not the body.
                Register.Body = zod_1.default.object({
                    path: Webhook.Path,
                    method: Webhook.Method,
                    // Doubles as the registration's TTL, so the route and the node's wait
                    // expire together instead of the route outliving or undercutting it.
                    timeoutMs: zod_1.default.number(),
                    // Opaque to this server — stored at registration and echoed back on the
                    // answer so it reaches the parked node. The URL stays workflow-scoped;
                    // only the forwarding address knows about executions.
                    //
                    // Optional because Core.Chat.Input registers a route while parking on its
                    // own signal rather than a consultation. Such a route is registered but
                    // unanswerable — dispatch logs and drops it.
                    executionId: ids_2.ExecutionId.optional(),
                    consultationId: Consultation_1.Consultation.Id.optional(),
                });
                // Full internal contract — the backend rejoins the URL's workflowId before
                // forwarding to the webhook server.
                Register.Request = Register.Body.extend({
                    workflowId: Webhook.WorkflowId,
                });
                Register.Response = zod_1.default.object({ ok: zod_1.default.literal(true) });
            })(Register = API.Register || (API.Register = {}));
            async function register(api, req) {
                const { workflowId, ...body } = req;
                const { data } = await api.post(`/api/test-webhooks/${workflowId}/register`, body);
                return data;
            }
            API.register = register;
        })(API = Test.API || (Test.API = {}));
    })(Test = Webhook.Test || (Webhook.Test = {}));
})(Webhook || (exports.Webhook = Webhook = {}));
