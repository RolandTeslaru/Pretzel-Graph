"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Workspace = void 0;
const zod_1 = __importDefault(require("zod"));
const Auth_1 = require("../Auth");
const role_1 = require("./role");
// Who may act in this deployment, and with what rank.
var Workspace;
(function (Workspace) {
    Workspace.Role = role_1.Role;
    let Member;
    (function (Member) {
        Member.Schema = zod_1.default.object({
            user_id: Auth_1.Auth.User.Id,
            role: Workspace.Role,
            created_at: zod_1.default.coerce.date(),
            updated_at: zod_1.default.coerce.date(),
        });
    })(Member = Workspace.Member || (Workspace.Member = {}));
})(Workspace || (exports.Workspace = Workspace = {}));
