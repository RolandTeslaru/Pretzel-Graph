"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vault = void 0;
const zod_1 = require("zod");
const Field_1 = require("./Foundations/Field");
var Vault;
(function (Vault) {
    let Database;
    (function (Database) {
        let Insert;
        (function (Insert) {
            let CredentialInstance;
            (function (CredentialInstance) {
                CredentialInstance.Schema = zod_1.z.object({
                    name: zod_1.z.string(),
                    templateId: zod_1.z.string().brand("CredentialTemplateId"),
                    blob: zod_1.z.string().brand("EncryptedBlob"),
                });
            })(CredentialInstance = Insert.CredentialInstance || (Insert.CredentialInstance = {}));
        })(Insert = Database.Insert || (Database.Insert = {}));
    })(Database = Vault.Database || (Vault.Database = {}));
    let Credential;
    (function (Credential) {
        let Template;
        (function (Template) {
            Template.Id = zod_1.z.string().brand("CredentialTemplateId");
            Template.Schema = zod_1.z.object({
                id: Template.Id,
                displayName: zod_1.z.string(),
                fields: zod_1.z.array(Field_1.Field.Schema).readonly(),
                icon: zod_1.z.string().optional(),
                // Nothing attached is a valid state — validation won't flag it as missing.
                optional: zod_1.z.boolean().optional(),
            });
        })(Template = Credential.Template || (Credential.Template = {}));
        let Instance;
        (function (Instance) {
            Instance.Id = zod_1.z.uuid().brand("CredentialInstanceId");
            Instance.Schema = zod_1.z.object({
                id: Instance.Id,
                template_id: Template.Id,
                name: zod_1.z.string(),
                created_at: zod_1.z.string(),
                updated_at: zod_1.z.string(),
                blob: zod_1.z.string().brand("EncryptedBlob"),
            });
            Instance.EncryptedBlob = zod_1.z.string().brand("EncryptedBlob");
            // Type-preserving: a credential field's value keeps its real type through
            // the encrypted blob (Boolean → boolean, Integer → number), mirroring
            // Workflow.staticValues. The blob is JSON, so any JSON value round-trips.
            Instance.DecryptedValues = zod_1.z.record(Field_1.Field.Id, zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.array(zod_1.z.string()), zod_1.z.json()]));
        })(Instance = Credential.Instance || (Credential.Instance = {}));
    })(Credential = Vault.Credential || (Vault.Credential = {}));
    let API;
    (function (API) {
        let CredentialTemplate;
        (function (CredentialTemplate) {
            let Get;
            (function (Get) {
                Get.Request = zod_1.z.object({
                    id: Credential.Template.Id,
                });
                Get.Response = zod_1.z.object({
                    template: Credential.Template.Schema,
                });
            })(Get = CredentialTemplate.Get || (CredentialTemplate.Get = {}));
            async function get(api, id) {
                const { data } = await api.get(`/api/vault/credential-templates/${id}`);
                return data;
            }
            CredentialTemplate.get = get;
            let GetBatch;
            (function (GetBatch) {
                GetBatch.Request = zod_1.z.object({
                    ids: zod_1.z.array(Credential.Template.Id),
                });
                GetBatch.Response = zod_1.z.object({
                    templates: zod_1.z.record(Credential.Template.Id, Credential.Template.Schema),
                });
            })(GetBatch = CredentialTemplate.GetBatch || (CredentialTemplate.GetBatch = {}));
            async function getBatch(api, req) {
                const { data } = await api.post('/api/vault/credential-templates/getBatch', req);
                return data;
            }
            CredentialTemplate.getBatch = getBatch;
        })(CredentialTemplate = API.CredentialTemplate || (API.CredentialTemplate = {}));
        let CredentialInstance;
        (function (CredentialInstance) {
            let List;
            (function (List) {
                List.Response = zod_1.z.object({
                    instances: zod_1.z.record(Credential.Instance.Id, Credential.Instance.Schema),
                });
            })(List = CredentialInstance.List || (CredentialInstance.List = {}));
            async function list(api) {
                const { data } = await api.get('/api/vault/credential-instances');
                return data;
            }
            CredentialInstance.list = list;
            let Create;
            (function (Create) {
                Create.Request = zod_1.z.object({
                    name: zod_1.z.string().min(1),
                    templateId: Credential.Template.Id,
                    fieldValues: Credential.Instance.DecryptedValues,
                });
                Create.Response = zod_1.z.object({
                    instance: Credential.Instance.Schema,
                });
            })(Create = CredentialInstance.Create || (CredentialInstance.Create = {}));
            async function create(api, req) {
                const { data } = await api.post('/api/vault/credential-instances', req);
                return data;
            }
            CredentialInstance.create = create;
            let Remove;
            (function (Remove) {
                Remove.Request = zod_1.z.object({
                    id: Credential.Instance.Id,
                });
                Remove.Response = zod_1.z.object({ ok: zod_1.z.literal(true) });
            })(Remove = CredentialInstance.Remove || (CredentialInstance.Remove = {}));
            async function remove(api, req) {
                const { data } = await api.delete(`/api/vault/credential-instances/${req.id}`);
                return data;
            }
            CredentialInstance.remove = remove;
            let UpdateName;
            (function (UpdateName) {
                UpdateName.Request = zod_1.z.object({
                    id: Credential.Instance.Id,
                    name: zod_1.z.string().min(1),
                });
                UpdateName.Response = zod_1.z.object({
                    instance: Credential.Instance.Schema,
                });
            })(UpdateName = CredentialInstance.UpdateName || (CredentialInstance.UpdateName = {}));
            async function updateName(api, req) {
                const { id, ...payload } = req;
                const { data } = await api.patch(`/api/vault/credential-instances/${id}/name`, payload);
                return data;
            }
            CredentialInstance.updateName = updateName;
            let Update;
            (function (Update) {
                Update.Request = zod_1.z.object({
                    id: Credential.Instance.Id,
                    name: zod_1.z.string().min(1),
                    fieldValues: Credential.Instance.DecryptedValues,
                });
                Update.Response = zod_1.z.object({
                    instance: Credential.Instance.Schema,
                });
            })(Update = CredentialInstance.Update || (CredentialInstance.Update = {}));
            async function update(api, req) {
                const { id, ...payload } = req;
                const { data } = await api.patch(`/api/vault/credential-instances/${id}`, payload);
                return data;
            }
            CredentialInstance.update = update;
            let Reveal;
            (function (Reveal) {
                Reveal.Response = zod_1.z.object({
                    fieldValues: Credential.Instance.DecryptedValues,
                });
            })(Reveal = CredentialInstance.Reveal || (CredentialInstance.Reveal = {}));
            async function reveal(api, id) {
                const { data } = await api.post(`/api/vault/credential-instances/${id}/reveal`);
                return data;
            }
            CredentialInstance.reveal = reveal;
        })(CredentialInstance = API.CredentialInstance || (API.CredentialInstance = {}));
    })(API = Vault.API || (Vault.API = {}));
})(Vault || (exports.Vault = Vault = {}));
