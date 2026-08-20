"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKey = void 0;
const zod_1 = require("zod");
const Auth_1 = require("./Auth");
const zod_utils_1 = require("./zod-utils");
var ApiKey;
(function (ApiKey) {
    ApiKey.Id = zod_1.z.uuid().brand("ApiKeyId");
    // Raw key format: pg_live_<32-char-base62>. Returned once at creation, never stored.
    ApiKey.Raw = zod_1.z.string().regex(/^pg_live_[A-Za-z0-9]{32}$/);
    // Public-safe shape for the dashboard. Never includes key_hash.
    ApiKey.Schema = zod_1.z.object({
        id: ApiKey.Id,
        user_id: Auth_1.Auth.User.Id,
        name: zod_1.z.string(),
        prefix: zod_1.z.string(),
        last_used_at: zod_utils_1.supabaseTimestamp.nullable(),
        expires_at: zod_utils_1.supabaseTimestamp.nullable(),
        revoked_at: zod_utils_1.supabaseTimestamp.nullable(),
        created_at: zod_utils_1.supabaseTimestamp,
    });
    let API;
    (function (API) {
        let Create;
        (function (Create) {
            Create.Request = zod_1.z.object({ name: zod_1.z.string().min(1).max(64) });
            Create.Response = zod_1.z.object({ apiKey: ApiKey.Schema, raw: ApiKey.Raw });
        })(Create = API.Create || (API.Create = {}));
        let List;
        (function (List) {
            List.Request = zod_1.z.object({});
            List.Response = zod_1.z.object({ apiKeys: zod_1.z.array(ApiKey.Schema) });
        })(List = API.List || (API.List = {}));
        let Revoke;
        (function (Revoke) {
            Revoke.Request = zod_1.z.object({ id: ApiKey.Id });
            Revoke.Response = zod_1.z.object({});
        })(Revoke = API.Revoke || (API.Revoke = {}));
    })(API = ApiKey.API || (ApiKey.API = {}));
})(ApiKey || (exports.ApiKey = ApiKey = {}));
