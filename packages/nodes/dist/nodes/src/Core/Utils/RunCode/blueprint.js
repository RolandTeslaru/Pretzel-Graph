"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Utils.RunCode",
    displayName: "Run Code",
    description: "Runs sandboxed JavaScript with access to the incoming data via $in.",
    icon: "FileCode",
    accent: "utility",
    iconColor: "color-emerald-400",
    fields: [
        node_sdk_1.FieldBuilder.Script("code", "Code", {
            initialValue: "return { hello: \"world\" };"
        }),
    ],
    inputs: [],
    outputs: [
        node_sdk_1.OutputBuilder.Data("output", "Output", {}),
    ],
});
