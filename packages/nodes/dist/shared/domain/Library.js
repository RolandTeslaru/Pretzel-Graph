"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Library = void 0;
const zod_1 = require("zod");
const Workflow_1 = require("./Workflow");
var Library;
(function (Library) {
    let Folder;
    (function (Folder) {
        Folder.Id = zod_1.z.uuid().brand("FolderId");
        Folder.Schema = zod_1.z.object({
            id: Folder.Id,
            parent_folder_id: Folder.Id.nullable(),
            is_root: zod_1.z.boolean(),
            display_name: zod_1.z.string(),
            description: zod_1.z.string().nullable(),
            created_at: zod_1.z.string(),
            updated_at: zod_1.z.string(),
        });
    })(Folder = Library.Folder || (Library.Folder = {}));
    let WorkflowMeta;
    (function (WorkflowMeta) {
        WorkflowMeta.Schema = Workflow_1.Workflow.Schema.omit({ data: true });
    })(WorkflowMeta = Library.WorkflowMeta || (Library.WorkflowMeta = {}));
    // ─────────────────────────────────────────────────────────────
    // API request/response shapes
    // Request shapes mirror DB column names so they can be passed
    // straight to Supabase .insert() / .update() with no mapping.
    // ─────────────────────────────────────────────────────────────
    let API;
    (function (API) {
        // ── Bootstrap ────────────────────────────────────────
        let Bootstrap;
        (function (Bootstrap) {
            let Get;
            (function (Get) {
                Get.Request = zod_1.z.object({});
                Get.Response = zod_1.z.object({
                    projects: zod_1.z.array(Library.Folder.Schema),
                    folders: zod_1.z.array(Library.Folder.Schema),
                    workflow_metas: zod_1.z.array(Library.WorkflowMeta.Schema),
                });
            })(Get = Bootstrap.Get || (Bootstrap.Get = {}));
            async function get(api, req = {}) {
                const { data } = await api.get('/api/library/bootstrap', {
                    params: req,
                });
                return data;
            }
            Bootstrap.get = get;
        })(Bootstrap = API.Bootstrap || (API.Bootstrap = {}));
        // ── Projects ──────────────────────────────────────────
        let Project;
        (function (Project) {
            let Create;
            (function (Create) {
                Create.Request = zod_1.z.object({
                    display_name: zod_1.z.string().min(1),
                    description: zod_1.z.string().nullable().optional(),
                });
            })(Create = Project.Create || (Project.Create = {}));
            let Update;
            (function (Update) {
                Update.Request = zod_1.z.object({
                    id: Library.Folder.Id,
                    display_name: zod_1.z.string().min(1),
                    description: zod_1.z.string().nullable().optional(),
                });
            })(Update = Project.Update || (Project.Update = {}));
            let List;
            (function (List) {
                List.Request = zod_1.z.object({});
                List.Response = zod_1.z.array(Library.Folder.Schema);
            })(List = Project.List || (Project.List = {}));
            async function create(api, req) {
                const { data } = await api.post("/api/library/projects", req);
                return data;
            }
            Project.create = create;
            async function list(api, req = {}) {
                const { data } = await api.get("/api/library/projects", {
                    params: req,
                });
                return data;
            }
            Project.list = list;
            async function update(api, req) {
                const { id, ...payload } = req;
                const { data } = await api.patch(`/api/library/projects/${id}`, payload);
                return data;
            }
            Project.update = update;
            let Remove;
            (function (Remove) {
                Remove.Request = zod_1.z.object({ id: Library.Folder.Id });
                Remove.Response = zod_1.z.object({ ok: zod_1.z.literal(true) });
            })(Remove = Project.Remove || (Project.Remove = {}));
            async function remove(api, req) {
                const { data } = await api.delete(`/api/library/projects/${req.id}`);
                return data;
            }
            Project.remove = remove;
        })(Project = API.Project || (API.Project = {}));
        // ── Folders ───────────────────────────────────────────
        let Folder;
        (function (Folder) {
            let Create;
            (function (Create) {
                Create.Request = zod_1.z.object({
                    parent_folder_id: Library.Folder.Id,
                    display_name: zod_1.z.string().min(1),
                    description: zod_1.z.string().nullable().optional(),
                });
            })(Create = Folder.Create || (Folder.Create = {}));
            let Update;
            (function (Update) {
                Update.Request = zod_1.z.object({
                    id: Library.Folder.Id,
                    display_name: zod_1.z.string().min(1),
                    description: zod_1.z.string().nullable().optional(),
                });
            })(Update = Folder.Update || (Folder.Update = {}));
            let Remove;
            (function (Remove) {
                Remove.Request = zod_1.z.object({ id: Library.Folder.Id });
            })(Remove = Folder.Remove || (Folder.Remove = {}));
            // One-level-deep contents of a folder:
            // the folder itself + its immediate child folders + workflows.
            let GetContents;
            (function (GetContents) {
                GetContents.Request = zod_1.z.object({ id: Library.Folder.Id });
                GetContents.ResponseSchema = zod_1.z.object({
                    folder: Library.Folder.Schema,
                    child_folders: zod_1.z.array(Library.Folder.Schema),
                    workflows: zod_1.z.array(Library.WorkflowMeta.Schema),
                });
            })(GetContents = Folder.GetContents || (Folder.GetContents = {}));
            async function create(api, req) {
                const { data } = await api.post("/api/library/folders", req);
                return data;
            }
            Folder.create = create;
            async function update(api, req) {
                const { id, ...payload } = req;
                const { data } = await api.patch(`/api/library/folders/${id}`, payload);
                return data;
            }
            Folder.update = update;
            async function remove(api, req) {
                const { data } = await api.delete(`/api/library/folders/${req.id}`);
                return data;
            }
            Folder.remove = remove;
            async function getContents(api, req) {
                const { data } = await api.get(`/api/library/folders/${req.id}/contents`);
                return data;
            }
            Folder.getContents = getContents;
        })(Folder = API.Folder || (API.Folder = {}));
        // ── Workflows ─────────────────────────────────────────
        let Workflow;
        (function (Workflow) {
            let Create;
            (function (Create) {
                Create.Request = zod_1.z.object({
                    folder_id: Library.Folder.Id,
                    display_name: zod_1.z.string().min(1),
                    description: zod_1.z.string().nullable().optional(),
                });
            })(Create = Workflow.Create || (Workflow.Create = {}));
            let Update;
            (function (Update) {
                Update.Request = zod_1.z.object({
                    id: Workflow_1.Workflow.Id,
                    display_name: zod_1.z.string().min(1).optional(),
                    description: zod_1.z.string().nullable().optional(),
                    icon: zod_1.z.string().nullable().optional(),
                    accent: zod_1.z.string().nullable().optional(),
                    icon_color: zod_1.z.string().nullable().optional(),
                    locked: zod_1.z.boolean().optional(),
                });
            })(Update = Workflow.Update || (Workflow.Update = {}));
            let Get;
            (function (Get) {
                Get.Request = zod_1.z.object({ id: Workflow_1.Workflow.Id });
            })(Get = Workflow.Get || (Workflow.Get = {}));
            let Remove;
            (function (Remove) {
                Remove.Request = zod_1.z.object({ id: Workflow_1.Workflow.Id });
            })(Remove = Workflow.Remove || (Workflow.Remove = {}));
            async function create(api, req) {
                const { data } = await api.post("/api/library/workflows", req);
                return data;
            }
            Workflow.create = create;
            async function update(api, req) {
                const { id, ...payload } = req;
                const { data } = await api.patch(`/api/library/workflows/${id}`, payload);
                return data;
            }
            Workflow.update = update;
            async function remove(api, req) {
                const { data } = await api.delete(`/api/library/workflows/${req.id}`);
                return data;
            }
            Workflow.remove = remove;
            let Duplicate;
            (function (Duplicate) {
                Duplicate.Request = zod_1.z.object({ id: Workflow_1.Workflow.Id });
            })(Duplicate = Workflow.Duplicate || (Workflow.Duplicate = {}));
            async function duplicate(api, req) {
                const { data } = await api.post(`/api/library/workflows/${req.id}/duplicate`);
                return data;
            }
            Workflow.duplicate = duplicate;
        })(Workflow = API.Workflow || (API.Workflow = {}));
    })(API = Library.API || (Library.API = {}));
})(Library || (exports.Library = Library = {}));
