"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionControl = void 0;
const zod_1 = __importDefault(require("zod"));
const Workflow_1 = require("./Workflow");
const Realtime_1 = require("./Realtime");
var VersionControl;
(function (VersionControl) {
    // Canonical version-control publication record. workflow_data binds to the
    // current Workflow via a getter (Workflow is fully loaded before this module
    // through the domain barrel, and via the ./Workflow import here).
    let Publication;
    (function (Publication) {
        // Same brand as Workflow.Dependency.Publication.Id (structural).
        Publication.Id = zod_1.default.uuid().brand("PublicationId");
        Publication.Schema = zod_1.default.object({
            id: Publication.Id,
            workflow_id: Workflow_1.Workflow.Id,
            version: zod_1.default.number(),
            name: zod_1.default.string(),
            description: zod_1.default.string().nullable(),
            get workflow_data() { return Workflow_1.Workflow.Data.Schema; },
            is_active: zod_1.default.boolean(),
            published_at: zod_1.default.coerce.date(),
        });
        let Meta;
        (function (Meta) {
            Meta.Schema = Publication.Schema.omit({
                workflow_data: true,
            });
        })(Meta = Publication.Meta || (Publication.Meta = {}));
    })(Publication = VersionControl.Publication || (VersionControl.Publication = {}));
    // Signals are emitted by the backend when a publication changes state.
    // Subscribers (e.g. the webhook server) use them to keep caches in sync.
    let Signal;
    (function (Signal) {
        Signal.Channel = Realtime_1.Realtime.Channel.brand("VersionControl.Signal.Channel");
        Signal.Action = zod_1.default.enum(["published", "activated", "deactivated", "removed"]);
        Signal.getChannel = (workflowId, action) => `version_control:${workflowId}:${action}`;
        Signal.PATTERN_CHANNEL = "version_control:*";
        Signal.Base = Realtime_1.Realtime.Signal.Base.extend({
            workflowId: Workflow_1.Workflow.Id,
            publicationId: Publication.Id,
        });
        // No publication payload — the signal is only a nudge naming the workflow. A subscriber
        // re-reads the active publication from the DB (the authoritative source), so a signal can
        // neither be trusted nor forged into registering arbitrary routes.
        let Published;
        (function (Published) {
            Published.Schema = Signal.Base.extend({
                type: zod_1.default.literal("published"),
            });
        })(Published = Signal.Published || (Signal.Published = {}));
        let Activated;
        (function (Activated) {
            Activated.Schema = Signal.Base.extend({
                type: zod_1.default.literal("activated"),
            });
        })(Activated = Signal.Activated || (Signal.Activated = {}));
        let Deactivated;
        (function (Deactivated) {
            Deactivated.Schema = Signal.Base.extend({
                type: zod_1.default.literal("deactivated"),
            });
        })(Deactivated = Signal.Deactivated || (Signal.Deactivated = {}));
        let Removed;
        (function (Removed) {
            Removed.Schema = Signal.Base.extend({
                type: zod_1.default.literal("removed"),
            });
        })(Removed = Signal.Removed || (Signal.Removed = {}));
        Signal.Schema = zod_1.default.discriminatedUnion("type", [
            Published.Schema,
            Activated.Schema,
            Deactivated.Schema,
            Removed.Schema,
        ]);
    })(Signal = VersionControl.Signal || (VersionControl.Signal = {}));
    let API;
    (function (API) {
        // publish_workflow is SECURITY DEFINER and does not resolve through RLS, so the
        // workflow travels in the path where the route's scope guard proves ownership.
        let Publish;
        (function (Publish) {
            Publish.Request = zod_1.default.strictObject({
                name: zod_1.default.string(),
                description: zod_1.default.string().nullable().optional(),
                workflowData: Workflow_1.Workflow.Data.Schema,
            });
            Publish.Response = zod_1.default.object({
                publication: Publication.Schema,
            });
        })(Publish = API.Publish || (API.Publish = {}));
        async function publish(api, workflowId, req) {
            const { data } = await api.post(`/api/version-control/${workflowId}/publish`, req);
            return data;
        }
        API.publish = publish;
        let List;
        (function (List) {
            List.Response = zod_1.default.object({
                publications: Publication.Meta.Schema.array(),
            });
        })(List = API.List || (API.List = {}));
        async function list(api, workflowId) {
            const { data } = await api.get(`/api/version-control/list/${workflowId}`);
            return data;
        }
        API.list = list;
        let ListActiveWorkflows;
        (function (ListActiveWorkflows) {
            ListActiveWorkflows.Response = zod_1.default.object({
                activeWorkflows: zod_1.default.record(Workflow_1.Workflow.Id, Publication.Meta.Schema),
            });
        })(ListActiveWorkflows = API.ListActiveWorkflows || (API.ListActiveWorkflows = {}));
        async function listActiveWorkflows(api) {
            const { data } = await api.get("/api/version-control/active");
            return data;
        }
        API.listActiveWorkflows = listActiveWorkflows;
        let GetActiveByWorkflow;
        (function (GetActiveByWorkflow) {
            GetActiveByWorkflow.Response = zod_1.default.object({
                publication: Publication.Meta.Schema.nullable(),
            });
        })(GetActiveByWorkflow = API.GetActiveByWorkflow || (API.GetActiveByWorkflow = {}));
        async function getActiveByWorkflow(api, workflowId) {
            const { data } = await api.get(`/api/version-control/active/${workflowId}`);
            return data;
        }
        API.getActiveByWorkflow = getActiveByWorkflow;
        let Get;
        (function (Get) {
            Get.Response = zod_1.default.object({
                publication: Publication.Schema,
            });
        })(Get = API.Get || (API.Get = {}));
        async function get(api, publicationId) {
            const { data } = await api.get(`/api/version-control/${publicationId}`);
            return data;
        }
        API.get = get;
        let Activate;
        (function (Activate) {
            Activate.Response = zod_1.default.object({
                publication: Publication.Schema,
            });
        })(Activate = API.Activate || (API.Activate = {}));
        async function activate(api, workflowId, publicationId) {
            const { data } = await api.post(`/api/version-control/${workflowId}/${publicationId}/activate`);
            return data;
        }
        API.activate = activate;
        let Deactivate;
        (function (Deactivate) {
            Deactivate.Response = zod_1.default.object({
                publication: Publication.Schema,
            });
        })(Deactivate = API.Deactivate || (API.Deactivate = {}));
        async function deactivate(api, workflowId, publicationId) {
            const { data } = await api.post(`/api/version-control/${workflowId}/${publicationId}/deactivate`);
            return data;
        }
        API.deactivate = deactivate;
        let Remove;
        (function (Remove) {
            Remove.Response = zod_1.default.object({
                success: zod_1.default.boolean(),
                workflowId: Workflow_1.Workflow.Id,
            });
        })(Remove = API.Remove || (API.Remove = {}));
        async function remove(api, workflowId, publicationId) {
            const { data } = await api.delete(`/api/version-control/${workflowId}/${publicationId}`);
            return data;
        }
        API.remove = remove;
    })(API = VersionControl.API || (VersionControl.API = {}));
})(VersionControl || (exports.VersionControl = VersionControl = {}));
