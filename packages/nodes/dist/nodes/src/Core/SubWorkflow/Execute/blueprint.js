"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.SubWorkflow.Execute",
    displayName: "Execute Sub-Workflow",
    description: "Executes a saved sub-workflow and returns its output.",
    icon: "Graph",
    accent: "utility",
    fields: [],
    inputs: [],
    outputs: [],
    flags: {
        SHOW_DEPENDENCY_SELECTOR: true,
    },
});
