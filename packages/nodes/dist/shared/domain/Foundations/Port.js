"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Port = void 0;
const zod_1 = require("zod");
var Port;
(function (Port) {
    Port.Variant = zod_1.z.enum([
        "Message",
        "MessageList",
        "Document",
        "Text",
        "Data",
        "DataList",
        "LanguageModel",
        "Embeddings",
        "VectorStore",
        "Retriever",
        "Tool",
        "ToolList",
        "DataFrame",
        "Unresolved",
        "UnresolvedScalar",
        "UnresolvedList",
    ]);
    Port.Id = zod_1.z.string().brand("PortId");
    function portLiteral(value) {
        return zod_1.z.literal(value);
    }
    Port.PolymorphicGroupId = zod_1.z.string().brand("PolymorphicGroupId");
    Port.GroupId = zod_1.z.string().brand("GroupId");
    Port.Base = zod_1.z.object({
        id: Port.Id,
        displayName: zod_1.z.string().optional(),
        tooltip: zod_1.z.string().optional(),
        internal: zod_1.z.boolean().optional(),
        isAddedByUser: zod_1.z.boolean().optional(),
        polymorphicGroupId: Port.PolymorphicGroupId.optional(),
        groupId: Port.GroupId.optional(),
    });
    let Variants;
    (function (Variants) {
        Variants.Message = Port.Base.extend({
            variant: portLiteral("Message"),
            initialValue: zod_1.z.string().optional(),
            placeholder: zod_1.z.string().optional(),
        });
        Variants.MessageList = Port.Base.extend({
            variant: portLiteral("MessageList"),
            initialValue: zod_1.z.array(zod_1.z.string()).optional(),
        });
        Variants.Data = Port.Base.extend({
            variant: portLiteral("Data"),
            initialValue: zod_1.z.any().optional(),
        });
        Variants.DataList = Port.Base.extend({
            variant: portLiteral("DataList"),
            initialValue: zod_1.z.array(zod_1.z.any()).optional(),
        });
        Variants.Text = Port.Base.extend({
            variant: portLiteral("Text"),
            initialValue: zod_1.z.string().optional(),
        });
        Variants.LanguageModel = Port.Base.extend({
            variant: portLiteral("LanguageModel"),
        });
        Variants.Document = Port.Base.extend({
            variant: portLiteral("Document"),
        });
        Variants.Retriever = Port.Base.extend({
            variant: portLiteral("Retriever"),
        });
        Variants.Embeddings = Port.Base.extend({
            variant: portLiteral("Embeddings"),
        });
        Variants.VectorStore = Port.Base.extend({
            variant: portLiteral("VectorStore"),
        });
        Variants.Tool = Port.Base.extend({
            variant: portLiteral("Tool"),
        });
        Variants.ToolList = Port.Base.extend({
            variant: portLiteral("ToolList"),
        });
        Variants.DataFrame = Port.Base.extend({
            variant: portLiteral("DataFrame"),
        });
        Variants.Unresolved = Port.Base.extend({
            variant: portLiteral("Unresolved"),
        });
        Variants.UnresolvedScalar = Variants.Unresolved.extend({
            variant: portLiteral("UnresolvedScalar"),
        });
        Variants.UnresolvedList = Variants.Unresolved.extend({
            variant: portLiteral("UnresolvedList"),
        });
        Variants.Schema = zod_1.z.discriminatedUnion("variant", [
            Variants.Message,
            Variants.MessageList,
            Variants.Data,
            Variants.DataList,
            Variants.Text,
            Variants.LanguageModel,
            Variants.Document,
            Variants.Retriever,
            Variants.Embeddings,
            Variants.VectorStore,
            Variants.Tool,
            Variants.ToolList,
            Variants.DataFrame,
            Variants.Unresolved,
            Variants.UnresolvedScalar,
            Variants.UnresolvedList,
        ]);
    })(Variants = Port.Variants || (Port.Variants = {}));
    let Input;
    (function (Input) {
        Input.Id = Port.Id.brand("InputId");
        const inputFields = {
            id: Input.Id,
            required: zod_1.z.boolean(),
        };
        Input.Base = Port.Base.extend(inputFields);
        Input.Schema = zod_1.z.discriminatedUnion("variant", [
            Port.Variants.Message.extend(inputFields),
            Port.Variants.MessageList.extend(inputFields),
            Port.Variants.Data.extend(inputFields),
            Port.Variants.DataList.extend(inputFields),
            Port.Variants.Text.extend(inputFields),
            Port.Variants.LanguageModel.extend(inputFields),
            Port.Variants.Document.extend(inputFields),
            Port.Variants.Retriever.extend(inputFields),
            Port.Variants.Embeddings.extend(inputFields),
            Port.Variants.VectorStore.extend(inputFields),
            Port.Variants.Tool.extend(inputFields),
            Port.Variants.ToolList.extend(inputFields),
            Port.Variants.DataFrame.extend(inputFields),
            Port.Variants.Unresolved.extend(inputFields),
            Port.Variants.UnresolvedScalar.extend(inputFields),
            Port.Variants.UnresolvedList.extend(inputFields),
        ]);
    })(Input = Port.Input || (Port.Input = {}));
    let Output;
    (function (Output) {
        Output.Id = Port.Id.brand("OutputId");
        const outputFields = {
            id: Output.Id
        };
        Output.Base = Port.Base.extend(outputFields);
        Output.Schema = zod_1.z.discriminatedUnion("variant", [
            Port.Variants.Message.extend(outputFields),
            Port.Variants.MessageList.extend(outputFields),
            Port.Variants.Data.extend(outputFields),
            Port.Variants.DataList.extend(outputFields),
            Port.Variants.Text.extend(outputFields),
            Port.Variants.LanguageModel.extend(outputFields),
            Port.Variants.Document.extend(outputFields),
            Port.Variants.Retriever.extend(outputFields),
            Port.Variants.Embeddings.extend(outputFields),
            Port.Variants.VectorStore.extend(outputFields),
            Port.Variants.Tool.extend(outputFields),
            Port.Variants.ToolList.extend(outputFields),
            Port.Variants.DataFrame.extend(outputFields),
            Port.Variants.Unresolved.extend(outputFields),
            Port.Variants.UnresolvedScalar.extend(outputFields),
            Port.Variants.UnresolvedList.extend(outputFields),
        ]);
    })(Output = Port.Output || (Port.Output = {}));
    Port.UNRESOLVED_LIKE_VARIANTS = new Set(["Unresolved", "UnresolvedScalar", "UnresolvedList"]);
    Port.LIST_VARIANTS = new Set(["MessageList", "DataList", "ToolList"]);
    Port.SCALAR_VARIANTS = new Set(["Message", "Data", "Tool"]);
    function isUnresolvedLike(variant) {
        return Port.UNRESOLVED_LIKE_VARIANTS.has(variant);
    }
    Port.isUnresolvedLike = isUnresolvedLike;
    function isResolvedLike(variant) {
        return !Port.UNRESOLVED_LIKE_VARIANTS.has(variant);
    }
    Port.isResolvedLike = isResolvedLike;
    function isListLike(variant) {
        return Port.LIST_VARIANTS.has(variant);
    }
    Port.isListLike = isListLike;
    function isScalarLike(variant) {
        return Port.SCALAR_VARIANTS.has(variant);
    }
    Port.isScalarLike = isScalarLike;
    function isPolymorphic(port) {
        return !!port && "polymorphicGroupId" in port && port.polymorphicGroupId !== undefined;
    }
    Port.isPolymorphic = isPolymorphic;
    const _LIST_PROMOTION_MAP = {
        Message: "MessageList",
        Data: "DataList",
        Tool: "ToolList",
    };
    const _LIST_DEMOTION_MAP = {
        MessageList: "Message",
        DataList: "Data",
        ToolList: "Tool",
    };
    Port.LIST_PROMOTION_MAP = _LIST_PROMOTION_MAP;
    Port.LIST_DEMOTION_MAP = _LIST_DEMOTION_MAP;
    function promoteToList(variant) {
        return Port.LIST_PROMOTION_MAP[variant];
    }
    Port.promoteToList = promoteToList;
    function demoteToScalar(variant) {
        return Port.LIST_DEMOTION_MAP[variant];
    }
    Port.demoteToScalar = demoteToScalar;
})(Port || (exports.Port = Port = {}));
