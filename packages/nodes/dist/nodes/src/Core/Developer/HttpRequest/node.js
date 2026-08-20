"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
const tools_1 = require("./tools");
class Node extends node_sdk_1.RuntimeNode {
    client = this.httpClientFactory.create({
        vendor: "HTTP Request",
        validateStatus: () => true,
    });
    async onRun() {
        const fields = this.fieldValues;
        if (fields.isConvertedToTool === true)
            return {
                tools: (0, tools_1.buildTools)(this.client),
            };
        return {
            result: await (0, tools_1.executeHttpRequest)(this.client, {
                method: fields.method,
                url: fields.url,
                headers: fields.headers,
                body: fields.body,
            }),
        };
    }
}
exports.Node = Node;
