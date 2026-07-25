import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.AllBuilders",
    displayName: "All Builders",
    description: "A developer node showcasing all available field, input, and output builders.",
    icon: "Rocket",
    accent: "utility",
    fields: [
        FieldBuilder.String("stringField", "String Field", {
            initialValue: "Hello World",
            placeholder: "Enter text..."
        }),
        FieldBuilder.String("multilineStringField", "Multiline String Field", {
            initialValue: "Line 1\nLine 2",
            multiline: true
        }),
        FieldBuilder.Integer("integerField", "Integer Field", {
            initialValue: 42
        }),
        FieldBuilder.Integer("integerSliderField", "Integer Slider Field", {
            initialValue: 50,
            min: 0,
            max: 100,
            slider: true
        }),
        FieldBuilder.Float("floatField", "Float Field", {
            initialValue: 3.14
        }),
        FieldBuilder.Float("floatSliderField", "Float Slider Field", {
            initialValue: 0.5,
            min: 0,
            max: 1,
            step: 0.01,
            slider: true
        }),
        FieldBuilder.Boolean("booleanField", "Boolean Field", {
            initialValue: true
        }),
        FieldBuilder.MultiOption("multiOptionSelectField", "MultiOption Select", {
            options: [
                { value: "Option A" },
                { value: "Option B" },
                { value: "Option C" },
            ],

            initialValue: "Option A"
        }),
        FieldBuilder.MultiOption("multiOptionTabField", "MultiOption Tab", {
            options: [
                { value: "Tab 1" },
                { value: "Tab 2" },
            ],

            initialValue: "Tab 1",
            variant: "tab"
        }),
        FieldBuilder.File("fileField", "File Field", {
            fileTypes: [".txt", ".json", ".md"]
        }),
        FieldBuilder.List("listField", "List Field", {
            initialValue: ["Item 1", "Item 2"]
        }),
        FieldBuilder.Json("jsonField", "JSON Field", {
            initialValue: { key: "value" }
        }),
        FieldBuilder.Password("passwordField", "Password Field", {}),
        FieldBuilder.Script("scriptField", "Script Field", {
            initialValue: "console.log('Hello');"
        }),
    ],
    inputs: [
        InputBuilder.Message("messageInput", "Message Input", {
            required: true
        }),
        InputBuilder.LanguageModel("languageModelInput", "Language Model Input", {
            required: true
        }),
        InputBuilder.Document("documentInput", "Document Input", {
            required: true
        }),
        InputBuilder.Retriever("retrieverInput", "Retriever Input", {
            required: true
        }),
        InputBuilder.Embeddings("embeddingsInput", "Embeddings Input", {
            required: true
        }),
        InputBuilder.VectorStore("vectorStoreInput", "Vector Store Input", {
            required: true
        }),
        InputBuilder.Tool("toolInput", "Tool Input", {
            required: true
        }),
        InputBuilder.Unresolved("unresolvedInput", "Unresolved Input", {
            polymorphicGroupId: "unresolvedGroup",
            required: true
        }),
        InputBuilder.UnresolvedScalar("unresolvedScalarInput", "Unresolved Scalar Input", {
            polymorphicGroupId: "unresolvedScalarGroup",
            required: true
        }),
        InputBuilder.UnresolvedList("unresolvedListInput", "Unresolved List Input", {
            polymorphicGroupId: "unresolvedListGroup",
            required: true
        }),
        InputBuilder.ToolList("toolListInput", "Tool List Input", {
            required: true
        }),
        InputBuilder.MessageList("messageListInput", "Message List Input", {
            required: true
        }),
        InputBuilder.Data("dataInput", "Data Input", {
            required: true
        }),
        InputBuilder.DataList("dataListInput", "Data List Input", {
            required: true
        }),
    ],
    outputs: [
        OutputBuilder.Message("messageOutput", "Message Output", {}),
        OutputBuilder.Text("textOutput", "Text Output", {}),
        OutputBuilder.LanguageModel("languageModelOutput", "Language Model Output", {}),
        OutputBuilder.Document("documentOutput", "Document Output", {}),
        OutputBuilder.Retriever("retrieverOutput", "Retriever Output", {}),
        OutputBuilder.Embeddings("embeddingsOutput", "Embeddings Output", {}),
        OutputBuilder.VectorStore("vectorStoreOutput", "Vector Store Output", {}),
        OutputBuilder.Tool("toolOutput", "Tool Output", {}),
        OutputBuilder.DataFrame("dataFrameOutput", "DataFrame Output", {}),
        OutputBuilder.Unresolved("unresolvedOutput", "Unresolved Output", {
            polymorphicGroupId: "unresolvedGroup"
        }),
        OutputBuilder.UnresolvedScalar("unresolvedScalarOutput", "Unresolved Scalar Output", {
            polymorphicGroupId: "unresolvedScalarGroup"
        }),
        OutputBuilder.UnresolvedList("unresolvedListOutput", "Unresolved List Output", {
            polymorphicGroupId: "unresolvedListGroup"
        }),
        OutputBuilder.ToolList("toolListOutput", "Tool List Output", {}),
        OutputBuilder.MessageList("messageListOutput", "Message List Output", {}),
        OutputBuilder.Data("dataOutput", "Data Output", {}),
        OutputBuilder.DataList("dataListOutput", "Data List Output", {}),
    ],
});
