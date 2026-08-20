"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FolderId = exports.PublicationId = exports.EdgeId = exports.NodeId = exports.WorkflowId = void 0;
const zod_1 = require("zod");
exports.WorkflowId = zod_1.z.uuid().brand("WorkflowId");
exports.NodeId = zod_1.z.string().brand("NodeId");
exports.EdgeId = zod_1.z.string().brand("EdgeId");
exports.PublicationId = zod_1.z.uuid().brand("PublicationId");
exports.FolderId = zod_1.z.uuid().brand("FolderId");
