"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Workbench = void 0;
const zod_1 = __importDefault(require("zod"));
const Workflow_1 = require("./Workflow");
const Foundations_1 = require("./Foundations");
const Vault_1 = require("./Vault");
var Workbench;
(function (Workbench) {
    let API;
    (function (API) {
        let Workflow;
        (function (Workflow) {
            let Create;
            (function (Create) {
                Create.Request = zod_1.default.object({
                    workflow: Workflow_1.Workflow.Schema,
                });
                Create.Response = zod_1.default.object({
                    workflow_id: Workflow_1.Workflow.Id,
                });
            })(Create = Workflow.Create || (Workflow.Create = {}));
            async function create(api, request) {
                const { data } = await api.post("/api/workbench/workflows", request);
                return data;
            }
            Workflow.create = create;
            let Get;
            (function (Get) {
                Get.Request = zod_1.default.object({
                    workflowId: Workflow_1.Workflow.Id,
                });
                Get.Response = zod_1.default.object({
                    workflow: Workflow_1.Workflow.Schema,
                    blueprints: zod_1.default.record(Foundations_1.Foundations.Blueprint.Id, Foundations_1.Foundations.Blueprint.Schema),
                    repairs: zod_1.default.array(Workflow_1.Workflow.Repair.Schema),
                });
            })(Get = Workflow.Get || (Workflow.Get = {}));
            async function get(api, request, abortSignal) {
                const { data } = await api.get(`/api/workbench/workflows/${request.workflowId}`, { signal: abortSignal });
                return data;
            }
            Workflow.get = get;
            let Commit;
            (function (Commit) {
                Commit.Request = zod_1.default.object({
                    workflowId: Workflow_1.Workflow.Id,
                    data: Workflow_1.Workflow.Data.Schema,
                });
                Commit.Response = zod_1.default.object({});
            })(Commit = Workflow.Commit || (Workflow.Commit = {}));
            async function commit(api, request) {
                const { data } = await api.post("/api/workbench/workflows/commit", request, { timeout: 8_000 });
                return data;
            }
            Workflow.commit = commit;
        })(Workflow = API.Workflow || (API.Workflow = {}));
        let Dependency;
        (function (Dependency) {
            let Published;
            (function (Published) {
                let Load;
                (function (Load) {
                    Load.Request = zod_1.default.object({
                        dependencyId: Workflow_1.Workflow.Id,
                    });
                    Load.Response = zod_1.default.object({
                        dependency: Workflow_1.Workflow.Dependency.Publication.Schema,
                    });
                })(Load = Published.Load || (Published.Load = {}));
                async function load(api, request) {
                    const { data } = await api.get(`/api/workbench/dependencies/workflows/${request.dependencyId}/published`);
                    return data;
                }
                Published.load = load;
                let CheckUpdates;
                (function (CheckUpdates) {
                    CheckUpdates.Request = zod_1.default.object({
                        dependencies: zod_1.default.array(zod_1.default.object({
                            workflowId: Workflow_1.Workflow.Id,
                            publicationId: Workflow_1.Workflow.Dependency.Publication.Id,
                        })),
                    });
                    CheckUpdates.Response = zod_1.default.object({
                        updates: zod_1.default.record(Workflow_1.Workflow.Id, Workflow_1.Workflow.Dependency.Publication.UpdateInfo),
                    });
                })(CheckUpdates = Published.CheckUpdates || (Published.CheckUpdates = {}));
                async function checkUpdates(api, request) {
                    const { data } = await api.post(`/api/workbench/dependencies/check-updates`, request);
                    return data;
                }
                Published.checkUpdates = checkUpdates;
            })(Published = Dependency.Published || (Dependency.Published = {}));
            let Draft;
            (function (Draft) {
                let Load;
                (function (Load) {
                    Load.Request = zod_1.default.object({
                        dependencyId: Workflow_1.Workflow.Id,
                    });
                    Load.Response = zod_1.default.object({
                        dependency: Workflow_1.Workflow.Dependency.Draft.Schema,
                    });
                })(Load = Draft.Load || (Draft.Load = {}));
                async function load(api, request) {
                    const { data } = await api.get(`/api/workbench/dependencies/workflows/${request.dependencyId}/draft`);
                    return data;
                }
                Draft.load = load;
                let CheckUpdates;
                (function (CheckUpdates) {
                    CheckUpdates.Request = zod_1.default.object({
                        dependencies: zod_1.default.array(zod_1.default.object({
                            workflowId: Workflow_1.Workflow.Id,
                            workflow_updated_at: zod_1.default.coerce.date(),
                        })),
                    });
                    CheckUpdates.Response = zod_1.default.object({
                        updates: zod_1.default.record(Workflow_1.Workflow.Id, Workflow_1.Workflow.Dependency.Draft.UpdateInfo),
                    });
                })(CheckUpdates = Draft.CheckUpdates || (Draft.CheckUpdates = {}));
                async function checkUpdates(api, request) {
                    const { data } = await api.post(`/api/workbench/dependencies/check-draft-updates`, request);
                    return data;
                }
                Draft.checkUpdates = checkUpdates;
            })(Draft = Dependency.Draft || (Dependency.Draft = {}));
        })(Dependency = API.Dependency || (API.Dependency = {}));
        let Field;
        (function (Field) {
            let ResourceLoader;
            (function (ResourceLoader) {
                let LoadOptions;
                (function (LoadOptions) {
                    LoadOptions.Request = zod_1.default.object({
                        blueprintId: Foundations_1.Foundations.Blueprint.Id,
                        loaderId: Foundations_1.Foundations.Field.ResourceLoader.LoaderId,
                        fieldValues: zod_1.default.record(zod_1.default.string(), zod_1.default.any()).default({}),
                        credentialInstanceIds: zod_1.default.record(Vault_1.Vault.Credential.Template.Id, Vault_1.Vault.Credential.Instance.Id).default({}),
                        searchQuery: zod_1.default.string().optional(),
                        paginationCursor: zod_1.default.string().optional(),
                    });
                    LoadOptions.Response = zod_1.default.object({
                        options: zod_1.default.array(Foundations_1.Foundations.Field.ResourceLoader.OptionItem),
                        nextPaginationCursor: zod_1.default.string().optional(),
                    });
                })(LoadOptions = ResourceLoader.LoadOptions || (ResourceLoader.LoadOptions = {}));
                async function loadOptions(api, request) {
                    const { data } = await api.post('/api/workbench/field/resource-loader/load-options', request);
                    return data;
                }
                ResourceLoader.loadOptions = loadOptions;
            })(ResourceLoader = Field.ResourceLoader || (Field.ResourceLoader = {}));
        })(Field = API.Field || (API.Field = {}));
    })(API = Workbench.API || (Workbench.API = {}));
})(Workbench || (exports.Workbench = Workbench = {}));
