"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
class Node extends node_sdk_1.RuntimeNode {
    async onRun(incoming) {
        const { stringField } = this.fieldValues;
        const { messageInput, languageModelInput, documentInput, retrieverInput, embeddingsInput, vectorStoreInput, toolInput } = incoming;
        return {
            messageOutput: messageInput,
            textOutput: stringField,
            languageModelOutput: languageModelInput,
            documentOutput: documentInput,
            retrieverOutput: retrieverInput,
            embeddingsOutput: embeddingsInput,
            vectorStoreOutput: vectorStoreInput,
            toolOutput: toolInput,
            dataFrameOutput: { data: "frame" },
            unresolvedOutput: incoming.unresolvedInput,
            unresolvedScalarOutput: incoming.unresolvedScalarInput,
            unresolvedListOutput: incoming.unresolvedListInput,
            toolListOutput: incoming.toolListInput,
            messageListOutput: incoming.messageListInput,
            dataOutput: incoming.dataInput,
            dataListOutput: incoming.dataListInput,
        };
    }
}
exports.Node = Node;
