"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUBLIC_WORKFLOW_BLUEPRINTS_REVERSE = exports.PUBLIC_WORKFLOW_BLUEPRINTS = void 0;
exports.PUBLIC_WORKFLOW_BLUEPRINTS = {
    "Core.Agent": "b993f175-a07e-4d6e-bbdc-700ffb6b83a0",
    "Core.Utils.Compactor": "ac147960-ed28-44ed-8808-1e4348a6dda8",
};
exports.PUBLIC_WORKFLOW_BLUEPRINTS_REVERSE = Object.fromEntries(Object.entries(exports.PUBLIC_WORKFLOW_BLUEPRINTS).map(([blueprintId, workflowId]) => [workflowId, blueprintId]));
