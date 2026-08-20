"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Role = void 0;
const zod_1 = __importDefault(require("zod"));
// Its own module: Auth and Workspace both need it, and they already reference
// each other.
exports.Role = zod_1.default.enum(["owner", "admin", "member"]);
