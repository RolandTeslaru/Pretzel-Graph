"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blueprint = void 0;
const node_sdk_1 = require("../../../../../node-sdk/src/index.js");
exports.Blueprint = (0, node_sdk_1.defineBlueprint)({
    id: "Core.Developer.AllBuilders",
    displayName: "All Builders",
    description: "A developer node showcasing all available field, input, and output builders.",
    icon: "Rocket",
    accent: "utility",
    fields: [
        node_sdk_1.FieldBuilder.String("stringField", "String Field", {
            initialValue: "Hello World",
            placeholder: "Enter text..."
        }),
        node_sdk_1.FieldBuilder.String("multilineStringField", "Multiline String Field", {
            initialValue: "Line 1\nLine 2",
            multiline: true
        }),
        node_sdk_1.FieldBuilder.Integer("integerField", "Integer Field", {
            initialValue: 42
        }),
        node_sdk_1.FieldBuilder.Integer("integerSliderField", "Integer Slider Field", {
            initialValue: 50,
            min: 0,
            max: 100,
            slider: true
        }),
        node_sdk_1.FieldBuilder.Float("floatField", "Float Field", {
            initialValue: 3.14
        }),
        node_sdk_1.FieldBuilder.Float("floatSliderField", "Float Slider Field", {
            initialValue: 0.5,
            min: 0,
            max: 1,
            step: 0.01,
            slider: true
        }),
        node_sdk_1.FieldBuilder.Boolean("booleanField", "Boolean Field", {
            initialValue: true
        }),
        node_sdk_1.FieldBuilder.MultiOption("multiOptionSelectField", "MultiOption Select", {
            options: [
                { value: "Option A" },
                { value: "Option B" },
                { value: "Option C" },
            ],
            initialValue: "Option A"
        }),
        node_sdk_1.FieldBuilder.MultiOption("multiOptionTabField", "MultiOption Tab", {
            options: [
                { value: "Tab 1" },
                { value: "Tab 2" },
            ],
            initialValue: "Tab 1",
            variant: "tab"
        }),
        node_sdk_1.FieldBuilder.File("fileField", "File Field", {
            fileTypes: [".txt", ".json", ".md"]
        }),
        node_sdk_1.FieldBuilder.List("listField", "List Field", {
            initialValue: ["Item 1", "Item 2"]
        }),
        node_sdk_1.FieldBuilder.Json("jsonField", "JSON Field", {
            initialValue: { key: "value" }
        }),
        node_sdk_1.FieldBuilder.Password("passwordField", "Password Field", {}),
        node_sdk_1.FieldBuilder.Script("scriptField", "Script Field", {
            initialValue: "console.log('Hello');"
        }),
    ],
    inputs: [
        node_sdk_1.InputBuilder.Message("messageInput", "Message Input", {
            required: true
        }),
        node_sdk_1.InputBuilder.LanguageModel("languageModelInput", "Language Model Input", {
            required: true
        }),
        node_sdk_1.InputBuilder.Document("documentInput", "Document Input", {
            required: true
        }),
        node_sdk_1.InputBuilder.Retriever("retrieverInput", "Retriever Input", {
            required: true
        }),
        node_sdk_1.InputBuilder.Embeddings("embeddingsInput", "Embeddings Input", {
            required: true
        }),
        node_sdk_1.InputBuilder.VectorStore("vectorStoreInput", "Vector Store Input", {
            required: true
        }),
        node_sdk_1.InputBuilder.Tool("toolInput", "Tool Input", {
            required: true
        }),
        node_sdk_1.InputBuilder.Unresolved("unresolvedInput", "Unresolved Input", {
            polymorphicGroupId: "unresolvedGroup",
            required: true
        }),
        node_sdk_1.InputBuilder.UnresolvedScalar("unresolvedScalarInput", "Unresolved Scalar Input", {
            polymorphicGroupId: "unresolvedScalarGroup",
            required: true
        }),
        node_sdk_1.InputBuilder.UnresolvedList("unresolvedListInput", "Unresolved List Input", {
            polymorphicGroupId: "unresolvedListGroup",
            required: true
        }),
        node_sdk_1.InputBuilder.ToolList("toolListInput", "Tool List Input", {
            required: true
        }),
        node_sdk_1.InputBuilder.MessageList("messageListInput", "Message List Input", {
            required: true
        }),
        node_sdk_1.InputBuilder.Data("dataInput", "Data Input", {
            required: true
        }),
        node_sdk_1.InputBuilder.DataList("dataListInput", "Data List Input", {
            required: true
        }),
    ],
    outputs: [
        node_sdk_1.OutputBuilder.Message("messageOutput", "Message Output", {}),
        node_sdk_1.OutputBuilder.Text("textOutput", "Text Output", {}),
        node_sdk_1.OutputBuilder.LanguageModel("languageModelOutput", "Language Model Output", {}),
        node_sdk_1.OutputBuilder.Document("documentOutput", "Document Output", {}),
        node_sdk_1.OutputBuilder.Retriever("retrieverOutput", "Retriever Output", {}),
        node_sdk_1.OutputBuilder.Embeddings("embeddingsOutput", "Embeddings Output", {}),
        node_sdk_1.OutputBuilder.VectorStore("vectorStoreOutput", "Vector Store Output", {}),
        node_sdk_1.OutputBuilder.Tool("toolOutput", "Tool Output", {}),
        node_sdk_1.OutputBuilder.DataFrame("dataFrameOutput", "DataFrame Output", {}),
        node_sdk_1.OutputBuilder.Unresolved("unresolvedOutput", "Unresolved Output", {
            polymorphicGroupId: "unresolvedGroup"
        }),
        node_sdk_1.OutputBuilder.UnresolvedScalar("unresolvedScalarOutput", "Unresolved Scalar Output", {
            polymorphicGroupId: "unresolvedScalarGroup"
        }),
        node_sdk_1.OutputBuilder.UnresolvedList("unresolvedListOutput", "Unresolved List Output", {
            polymorphicGroupId: "unresolvedListGroup"
        }),
        node_sdk_1.OutputBuilder.ToolList("toolListOutput", "Tool List Output", {}),
        node_sdk_1.OutputBuilder.MessageList("messageListOutput", "Message List Output", {}),
        node_sdk_1.OutputBuilder.Data("dataOutput", "Data Output", {}),
        node_sdk_1.OutputBuilder.DataList("dataListOutput", "Data List Output", {}),
    ],
});
