"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutputBuilder = void 0;
var OutputBuilder;
(function (OutputBuilder) {
    function buildBase(id, displayName, options) {
        return {
            id: id,
            displayName,
            tooltip: options.tooltip,
            internal: options.internal,
            groupId: options.groupId,
        };
    }
    function Message(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "Message",
        };
    }
    OutputBuilder.Message = Message;
    function Text(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "Text",
        };
    }
    OutputBuilder.Text = Text;
    function LanguageModel(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "LanguageModel",
        };
    }
    OutputBuilder.LanguageModel = LanguageModel;
    function Document(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "Document",
        };
    }
    OutputBuilder.Document = Document;
    function Retriever(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "Retriever",
        };
    }
    OutputBuilder.Retriever = Retriever;
    function Embeddings(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "Embeddings",
        };
    }
    OutputBuilder.Embeddings = Embeddings;
    function VectorStore(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "VectorStore",
        };
    }
    OutputBuilder.VectorStore = VectorStore;
    function Tool(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "Tool",
        };
    }
    OutputBuilder.Tool = Tool;
    function ToolList(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "ToolList",
        };
    }
    OutputBuilder.ToolList = ToolList;
    function DataFrame(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "DataFrame",
        };
    }
    OutputBuilder.DataFrame = DataFrame;
    function MessageList(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "MessageList",
        };
    }
    OutputBuilder.MessageList = MessageList;
    function Data(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "Data",
        };
    }
    OutputBuilder.Data = Data;
    function DataList(id, displayName, options = {}) {
        return {
            ...buildBase(id, displayName, options),
            variant: "DataList",
        };
    }
    OutputBuilder.DataList = DataList;
    function Unresolved(id, displayName, options) {
        return {
            ...buildBase(id, displayName, options),
            variant: "Unresolved",
            polymorphicGroupId: options.polymorphicGroupId,
        };
    }
    OutputBuilder.Unresolved = Unresolved;
    function UnresolvedScalar(id, displayName, options) {
        return {
            ...buildBase(id, displayName, options),
            variant: "UnresolvedScalar",
            polymorphicGroupId: options.polymorphicGroupId,
        };
    }
    OutputBuilder.UnresolvedScalar = UnresolvedScalar;
    function UnresolvedList(id, displayName, options) {
        return {
            ...buildBase(id, displayName, options),
            variant: "UnresolvedList",
            polymorphicGroupId: options.polymorphicGroupId,
        };
    }
    OutputBuilder.UnresolvedList = UnresolvedList;
})(OutputBuilder || (exports.OutputBuilder = OutputBuilder = {}));
