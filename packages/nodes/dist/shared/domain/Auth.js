"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Auth = void 0;
const zod_1 = require("zod");
const role_1 = require("./Workspace/role");
var Auth;
(function (Auth) {
    let User;
    (function (User) {
        User.Id = zod_1.z.uuid().brand("UserId");
        User.Schema = zod_1.z.object({
            id: User.Id,
            username: zod_1.z.string(),
            display_name: zod_1.z.string(),
            email: zod_1.z.string().nullable(),
            avatar_url: zod_1.z.string().nullable(),
            created_at: zod_1.z.string(),
            updated_at: zod_1.z.string(),
        });
        // Editable profile fields. Deliberately excludes email — owned by the identity
        // issuer (GoTrue), changing it needs a confirmation round trip. Privilege lives
        // in Workspace.Member.role, never on the user.
        User.Username = zod_1.z.string().trim()
            .min(3, 'Username must be at least 3 characters')
            .max(32, 'Username must be at most 32 characters')
            .regex(/^[a-zA-Z0-9_-]+$/, 'Letters, numbers, hyphens and underscores only');
        User.DisplayName = zod_1.z.string().trim()
            .min(1, 'Display name is required')
            .max(64, 'Display name must be at most 64 characters');
    })(User = Auth.User || (Auth.User = {}));
    let API;
    (function (API) {
        let Status;
        (function (Status) {
            Status.Response = zod_1.z.object({
                claimed: zod_1.z.boolean(),
            });
            /** Unauthenticated: the sign-in screen asks before anyone has an account. */
            async function get(api) {
                const { data } = await api.get('/api/auth/status');
                return data;
            }
            Status.get = get;
        })(Status = API.Status || (API.Status = {}));
        let Me;
        (function (Me) {
            let Get;
            (function (Get) {
                Get.Request = zod_1.z.object({});
                Get.Response = zod_1.z.object({
                    user: User.Schema,
                    role: role_1.Role,
                });
            })(Get = Me.Get || (Me.Get = {}));
            async function get(api, req = {}) {
                const { data } = await api.get('/api/auth/me', { params: req });
                return data;
            }
            Me.get = get;
            let Update;
            (function (Update) {
                Update.Request = zod_1.z.object({
                    username: User.Username,
                    display_name: User.DisplayName,
                });
                Update.Response = zod_1.z.object({
                    user: User.Schema,
                });
            })(Update = Me.Update || (Me.Update = {}));
            async function update(api, req) {
                const { data } = await api.patch('/api/auth/me', req);
                return data;
            }
            Me.update = update;
        })(Me = API.Me || (API.Me = {}));
    })(API = Auth.API || (Auth.API = {}));
})(Auth || (exports.Auth = Auth = {}));
