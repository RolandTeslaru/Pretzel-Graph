"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createId = exports.ExecutionId = void 0;
const zod_1 = __importDefault(require("zod"));
exports.ExecutionId = zod_1.default.uuid().brand("ExecutionId");
const createId = () => crypto.randomUUID();
exports.createId = createId;
