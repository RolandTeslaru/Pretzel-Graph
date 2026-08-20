"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Utils.JsonInjector",
    displayName: "JSON Injector",
    description: "Injects JSON data into the flow.",
    icon: "Braces",
    accent: "utility",
    fields: [
        node_sdk_1.FieldBuilder.Json("data", "JSON Data", {
            initialValue: {}
        }),
    ],
    inputs: [],
    outputs: [
        node_sdk_1.OutputBuilder.Data("output", "Output", {}),
    ],
});
