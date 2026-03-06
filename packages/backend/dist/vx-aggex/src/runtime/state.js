"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeState = void 0;
const langgraph_1 = require("@langchain/langgraph");
const domain_1 = require("@vx-agent-editor/shared/domain");
var RuntimeState;
(function (RuntimeState) {
    RuntimeState.Schema = new langgraph_1.StateSchema({
        node_outputs: new langgraph_1.ReducedValue(domain_1.Execution.Context.Schema.shape.node_outputs, {
            reducer: (x, y) => ({ ...x, ...y }),
        }),
        messages: langgraph_1.MessagesValue,
        attachments: new langgraph_1.ReducedValue(domain_1.Execution.Context.Schema.shape.attachments, {
            reducer: (x, y) => ({ ...x, ...y }),
        }),
        metadata: new langgraph_1.ReducedValue(domain_1.Execution.Context.Schema.shape.metadata, {
            reducer: (x, y) => ({ ...x, ...y }),
        }),
        chatId: domain_1.Execution.Context.Schema.shape.chatId,
        streamController: new langgraph_1.UntrackedValue(),
        emit: new langgraph_1.UntrackedValue(),
        jobId: new langgraph_1.UntrackedValue(),
        workflowCache: new langgraph_1.UntrackedValue(),
        // TODO: fix typing here
        workflow: new langgraph_1.UntrackedValue(),
    });
    RuntimeState.Update = RuntimeState.Schema.Update;
})(RuntimeState || (exports.RuntimeState = RuntimeState = {}));
;
