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
exports.Execution = void 0;
const zod_1 = __importDefault(require("zod"));
const Workflow_1 = require("../Workflow");
const zod_utils_1 = require("../zod-utils");
const SystemError_1 = require("../SystemError");
const Vault_1 = require("../Vault");
const RecordingMod = __importStar(require("./recording"));
const IgniterMod = __importStar(require("./igniter"));
const SessionMod = __importStar(require("./session"));
const EventMod = __importStar(require("./event"));
const SignalMod = __importStar(require("./signal"));
const ids_1 = require("./ids");
var Execution;
(function (Execution) {
    Execution.Id = ids_1.ExecutionId;
    Execution.createId = ids_1.createId;
    Execution.Status = zod_1.default.enum([
        "pending", "running", "paused", "suspended",
        "completed", "failed", "terminated"
    ]);
    Execution.Session = SessionMod.Session;
    Execution.Igniter = IgniterMod.Igniter;
    /**
     * A per-execution bearer credential: signed at enqueue, presented by the worker on
     * internal routes, and the sole source of the execution id those routes act on.
     *
     * Only the type lives here. sign/verify are in backend/src/auth/execution-token.ts
     * and stay there — they hold EXECUTION_TOKEN_SIGNING_KEY, so the worker can carry a
     * token but has no way to produce one. See SPECS/execution-token-delegation.md.
     */
    let Token;
    (function (Token) {
        Token.Schema = zod_1.default.string().brand("ExecutionToken");
        /** Node lowercases inbound header names — set and read with this exact value. */
        Token.HEADER = "execution-token";
        Token.Claims = zod_1.default.object({
            executionId: Execution.Id,
            exp: zod_1.default.number(),
        });
        /**
         * Reads the payload without checking the signature — the signing key is backend-only,
         * so this proves nothing about authenticity. For cross-checking a token against data
         * that travelled beside it; never for authorisation.
         */
        function decodeUnverified(token) {
            const [encoded, signature] = token.split(".");
            if (!encoded || !signature)
                return null;
            try {
                const json = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
                const parsed = Token.Claims.safeParse(JSON.parse(json));
                return parsed.success ? parsed.data : null;
            }
            catch {
                return null;
            }
        }
        Token.decodeUnverified = decodeUnverified;
    })(Token = Execution.Token || (Execution.Token = {}));
    let Queue;
    (function (Queue) {
        Queue.ID = 'workflow-execution';
        Queue.Item = zod_1.default.object({
            execution: Execution.Schema,
            workflowId: Workflow_1.Workflow.Id,
            workflowData: Workflow_1.Workflow.Data.Schema,
            credentialInstances: zod_1.default.record(Vault_1.Vault.Credential.Instance.Id, Vault_1.Vault.Credential.Instance.Schema),
            executionToken: Token.Schema,
        });
    })(Queue = Execution.Queue || (Execution.Queue = {}));
    Execution.Recording = RecordingMod.Recording;
    // ─── Top-level entity ─────────────────────────────────────────────────────
    // Execution = Job + Session collapsed into one record.
    // recording is nullable — only populated when igniter.record === true.
    // NEVER `SELECT *` from the executions table — recording can be large.
    Execution.Schema = zod_1.default.object({
        id: Execution.Id,
        workflow_id: Workflow_1.Workflow.Id,
        igniter: Execution.Igniter.Schema,
        status: Execution.Status,
        duration: zod_1.default.number(),
        error: SystemError_1.SystemError.Schema.nullish(),
        session: Execution.Session.Schema, // embedded; no separate id
        recording: Execution.Recording.Schema.nullable().default(null),
        created_at: zod_utils_1.supabaseTimestamp,
        updated_at: zod_utils_1.supabaseTimestamp,
    });
    Execution.Meta = Execution.Schema.omit({ session: true, recording: true }).extend({
        has_recording: zod_1.default.boolean(),
    });
    Execution.Event = EventMod.Event;
    Execution.Signal = SignalMod.Signal;
    let API;
    (function (API) {
        let Run;
        (function (Run) {
            // executionId stays in the body because it is a proposal: the client mints it and
            // subscribes to its channel before the row exists, so there is nothing to authorize
            // against. workflowId is the authorization boundary and travels in the path.
            Run.Request = zod_1.default.strictObject({
                workflowData: Workflow_1.Workflow.Data.Schema,
                executionId: Execution.Id.optional(),
                igniter: Execution.Igniter.Schema,
            });
            // Service-to-service, authenticated as a service rather than a user. It has no user
            // principal to scope against — runFromService derives the owner from the workflow —
            // so the id stays in the body here.
            Run.InternalRequest = Run.Request.extend({
                workflowId: Workflow_1.Workflow.Id,
            });
            Run.Response = zod_1.default.object({
                execution: Execution.Schema,
                isRecording: zod_1.default.boolean(),
            });
        })(Run = API.Run || (API.Run = {}));
        let SdkRun;
        (function (SdkRun) {
            SdkRun.Request = zod_1.default.object({
                workflowId: Workflow_1.Workflow.Id,
                inputs: zod_1.default.record(zod_1.default.string(), zod_1.default.unknown()).optional(),
                await: zod_1.default.boolean().optional(),
            });
            // await=true → full execution (same as Run.Response); await=false → just the id
            SdkRun.Response = zod_1.default.union([
                zod_1.default.object({ execution: Execution.Schema }),
                zod_1.default.object({ executionId: Execution.Id }),
            ]);
        })(SdkRun = API.SdkRun || (API.SdkRun = {}));
        async function run(api, workflowId, req) {
            const { data } = await api.post(`/api/execution/${workflowId}/run`, req);
            return data;
        }
        API.run = run;
        async function runInternal(api, req) {
            const { data } = await api.post('/api/execution/internal/run', req);
            return data;
        }
        API.runInternal = runInternal;
        async function sdkRun(api, req) {
            const { data } = await api.post('/api/execution/sdk/run', req);
            return data;
        }
        API.sdkRun = sdkRun;
        // The execution is the whole request, and it is now the whole path.
        let Pause;
        (function (Pause) {
            Pause.Response = zod_1.default.object({ success: zod_1.default.boolean() });
        })(Pause = API.Pause || (API.Pause = {}));
        async function pause(api, executionId) {
            const { data } = await api.post(`/api/execution/${executionId}/pause`, {});
            return data;
        }
        API.pause = pause;
        // The execution is the whole request, and it is now the whole path.
        let Resume;
        (function (Resume) {
            Resume.Response = zod_1.default.object({ success: zod_1.default.boolean() });
        })(Resume = API.Resume || (API.Resume = {}));
        async function resume(api, executionId) {
            const { data } = await api.post(`/api/execution/${executionId}/resume`, {});
            return data;
        }
        API.resume = resume;
        // The execution is the whole request, and it is now the whole path.
        let Suspend;
        (function (Suspend) {
            Suspend.Response = zod_1.default.object({ success: zod_1.default.boolean() });
        })(Suspend = API.Suspend || (API.Suspend = {}));
        async function suspend(api, executionId) {
            const { data } = await api.post(`/api/execution/${executionId}/suspend`, {});
            return data;
        }
        API.suspend = suspend;
        // The execution is the whole request, and it is now the whole path.
        let Terminate;
        (function (Terminate) {
            Terminate.Response = zod_1.default.object({ success: zod_1.default.boolean() });
        })(Terminate = API.Terminate || (API.Terminate = {}));
        async function terminate(api, executionId) {
            const { data } = await api.post(`/api/execution/${executionId}/terminate`, {});
            return data;
        }
        API.terminate = terminate;
        // The execution is the whole request, and it is now the whole path.
        let Heartbeat;
        (function (Heartbeat) {
            Heartbeat.Response = zod_1.default.object({});
        })(Heartbeat = API.Heartbeat || (API.Heartbeat = {}));
        async function heartbeat(api, executionId) {
            const { data } = await api.post(`/api/execution/${executionId}/heartbeat`, {});
            return data;
        }
        API.heartbeat = heartbeat;
        let Finalise;
        (function (Finalise) {
            Finalise.Request = zod_1.default.object({
                executionId: Execution.Id,
                status: Execution.Status,
            });
            Finalise.Response = zod_1.default.object({});
        })(Finalise = API.Finalise || (API.Finalise = {}));
        async function finalise(api, req) {
            const { data } = await api.post('/api/execution/finalise', req);
            return data;
        }
        API.finalise = finalise;
        let TerminateAll;
        (function (TerminateAll) {
            TerminateAll.Request = zod_1.default.object({});
            TerminateAll.Response = zod_1.default.object({ terminatedCount: zod_1.default.number() });
        })(TerminateAll = API.TerminateAll || (API.TerminateAll = {}));
        async function terminateAll(api) {
            const { data } = await api.post('/api/execution/terminate-all');
            return data;
        }
        API.terminateAll = terminateAll;
        // The execution is the whole request, and it is now the whole path.
        let Get;
        (function (Get) {
            Get.Response = zod_1.default.object({ execution: Execution.Schema });
        })(Get = API.Get || (API.Get = {}));
        async function get(api, executionId) {
            const { data } = await api.post(`/api/execution/${executionId}/get`, {});
            return data;
        }
        API.get = get;
        let Update;
        (function (Update) {
            Update.Request = zod_1.default.object({
                executionId: Execution.Id,
                status: Execution.Status.optional(),
                duration: zod_1.default.number().optional(),
                // Replaces the whole session column — not merged. Send a complete session.
                session: Execution.Session.Schema.optional(),
                recording: Execution.Recording.Schema.nullable().optional(),
            });
            Update.Response = zod_1.default.object({});
        })(Update = API.Update || (API.Update = {}));
        async function update(api, req) {
            const { data } = await api.post('/api/execution/update', req);
            return data;
        }
        API.update = update;
        // Reads the ephemeral recording from Redis (written at end of execution,
        // TTL-expiring). Use this immediately after a `recording:fullyUploaded`
        // event to reconcile any missed event patches. Supabase is authoritative
        // beyond the TTL window — fall back to Execution.API.get for old runs.
        let Recording;
        (function (Recording) {
            let GetLive;
            (function (GetLive) {
                GetLive.Response = zod_1.default.object({ recording: Execution.Recording.Schema });
            })(GetLive = Recording.GetLive || (Recording.GetLive = {}));
            async function getLive(api, executionId) {
                const { data } = await api.post(`/api/execution/${executionId}/recording/get-live`, {});
                return data;
            }
            Recording.getLive = getLive;
        })(Recording = API.Recording || (API.Recording = {}));
        let Meta;
        (function (Meta) {
            // The workflow was the entire request, and it is now the entire path.
            let List;
            (function (List) {
                List.Response = zod_1.default.object({ executions: zod_1.default.array(Execution.Meta) });
            })(List = Meta.List || (Meta.List = {}));
            async function list(api, workflowId) {
                const { data } = await api.post(`/api/execution/${workflowId}/meta/list`, {});
                return data;
            }
            Meta.list = list;
            // The execution is the whole request, and it is now the whole path.
            let Get;
            (function (Get) {
                Get.Response = zod_1.default.object({ execution: Execution.Meta });
            })(Get = Meta.Get || (Meta.Get = {}));
            async function get(api, executionId) {
                const { data } = await api.post(`/api/execution/${executionId}/meta/get`, {});
                return data;
            }
            Meta.get = get;
            let ListActive;
            (function (ListActive) {
                ListActive.Request = zod_1.default.object({});
                ListActive.Response = zod_1.default.object({ executions: zod_1.default.array(Execution.Meta) });
            })(ListActive = Meta.ListActive || (Meta.ListActive = {}));
        })(Meta = API.Meta || (API.Meta = {}));
    })(API = Execution.API || (Execution.API = {}));
})(Execution || (exports.Execution = Execution = {}));
