"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputBuilder = void 0;
var InputBuilder;
(function (InputBuilder) {
    function buildBase(id, displayName, options) {
        return {
            id: id,
            displayName,
            required: options.required ?? false,
            internal: options.internal ?? false,
            tooltip: options.tooltip,
            groupId: options.groupId,
        };
    }
    function Message(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "Message",
            initialValue: options.initialValue ?? "",
        };
    }
    InputBuilder.Message = Message;
    function Text(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "Text",
            initialValue: options.initialValue ?? "",
        };
    }
    InputBuilder.Text = Text;
    function LanguageModel(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "LanguageModel",
        };
    }
    InputBuilder.LanguageModel = LanguageModel;
    function Document(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "Document",
        };
    }
    InputBuilder.Document = Document;
    function Retriever(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "Retriever",
        };
    }
    InputBuilder.Retriever = Retriever;
    function Embeddings(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "Embeddings",
        };
    }
    InputBuilder.Embeddings = Embeddings;
    function VectorStore(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "VectorStore",
        };
    }
    InputBuilder.VectorStore = VectorStore;
    function Tool(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "Tool",
        };
    }
    InputBuilder.Tool = Tool;
    function ToolList(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "ToolList",
        };
    }
    InputBuilder.ToolList = ToolList;
    function MessageList(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "MessageList",
        };
    }
    InputBuilder.MessageList = MessageList;
    function Data(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "Data",
        };
    }
    InputBuilder.Data = Data;
    function DataList(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "DataList",
        };
    }
    InputBuilder.DataList = DataList;
    function Unresolved(id, displayName, options) {
        return {
            ...buildBase(id, displayName, options),
            variant: "Unresolved",
            polymorphicGroupId: options.polymorphicGroupId,
        };
    }
    InputBuilder.Unresolved = Unresolved;
    function UnresolvedScalar(id, displayName, options) {
        return {
            ...buildBase(id, displayName, options),
            variant: "UnresolvedScalar",
            polymorphicGroupId: options.polymorphicGroupId,
        };
    }
    InputBuilder.UnresolvedScalar = UnresolvedScalar;
    function UnresolvedList(id, displayName, options) {
        return {
            ...buildBase(id, displayName, options),
            variant: "UnresolvedList",
            polymorphicGroupId: options.polymorphicGroupId,
        };
    }
    InputBuilder.UnresolvedList = UnresolvedList;
})(InputBuilder || (exports.InputBuilder = InputBuilder = {}));
