import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "src/nodes/builders";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.AllBuilders",
    displayName: "All Builders",
    description: "A developer node showcasing all available field, input, and output builders.",
    icon: "Rocket",
    accent: "utility",
    fields: [
        FieldBuilder.String({
            id: "stringField",
            displayName: "String Field",
            initialValue: "Hello World",
            placeholder: "Enter text...",
        }),
        FieldBuilder.String({
            id: "multilineStringField",
            displayName: "Multiline String Field",
            initialValue: "Line 1\nLine 2",
            multiline: true,
        }),
        FieldBuilder.Integer({
            id: "integerField",
            displayName: "Integer Field",
            initialValue: 42,
        }),
        FieldBuilder.Integer({
            id: "integerSliderField",
            displayName: "Integer Slider Field",
            initialValue: 50,
            min: 0,
            max: 100,
            slider: true,
        }),
        FieldBuilder.Float({
            id: "floatField",
            displayName: "Float Field",
            initialValue: 3.14,
        }),
        FieldBuilder.Float({
            id: "floatSliderField",
            displayName: "Float Slider Field",
            initialValue: 0.5,
            min: 0,
            max: 1,
            step: 0.01,
            slider: true,
        }),
        FieldBuilder.Boolean({
            id: "booleanField",
            displayName: "Boolean Field",
            initialValue: true,
        }),
        FieldBuilder.MultiOption({
            id: "multiOptionSelectField",
            displayName: "MultiOption Select",
            options: [
                { value: "Option A" },
                { value: "Option B" },
                { value: "Option C" },
            ],
            initialValue: "Option A",
        }),
        FieldBuilder.MultiOption({
            id: "multiOptionTabField",
            displayName: "MultiOption Tab",
            options: [
                { value: "Tab 1" },
                { value: "Tab 2" },
            ],
            initialValue: "Tab 1",
            variant: "tab",
        }),
        FieldBuilder.File({
            id: "fileField",
            displayName: "File Field",
            fileTypes: [".txt", ".json", ".md"],
        }),
        FieldBuilder.List({
            id: "listField",
            displayName: "List Field",
            initialValue: ["Item 1", "Item 2"],
        }),
        FieldBuilder.Json({
            id: "jsonField",
            displayName: "JSON Field",
            initialValue: { key: "value" },
        }),
        FieldBuilder.Secret({
            id: "secretField",
            displayName: "Secret Field",
        }),
        FieldBuilder.Script({
            id: "scriptField",
            displayName: "Script Field",
            initialValue: "console.log('Hello');",
        }),
    ],
    inputs: [
        InputBuilder.Message({
            id: "messageInput",
            displayName: "Message Input",
        }),
        InputBuilder.LanguageModel({
            id: "languageModelInput",
            displayName: "Language Model Input",
        }),
        InputBuilder.Document({
            id: "documentInput",
            displayName: "Document Input",
        }),
        InputBuilder.Retriever({
            id: "retrieverInput",
            displayName: "Retriever Input",
        }),
        InputBuilder.Embeddings({
            id: "embeddingsInput",
            displayName: "Embeddings Input",
        }),
        InputBuilder.VectorStore({
            id: "vectorStoreInput",
            displayName: "Vector Store Input",
        }),
        InputBuilder.Tool({
            id: "toolInput",
            displayName: "Tool Input",
        }),
        InputBuilder.Unresolved({
            id: "unresolvedInput",
            displayName: "Unresolved Input",
            polymorphicGroupId: "unresolvedGroup",
        }),
        InputBuilder.UnresolvedScalar({
            id: "unresolvedScalarInput",
            displayName: "Unresolved Scalar Input",
            polymorphicGroupId: "unresolvedScalarGroup",
        }),
        InputBuilder.UnresolvedList({
            id: "unresolvedListInput",
            displayName: "Unresolved List Input",
            polymorphicGroupId: "unresolvedListGroup",
        }),
        InputBuilder.ToolList({
            id: "toolListInput",
            displayName: "Tool List Input",
        }),
        InputBuilder.MessageList({
            id: "messageListInput",
            displayName: "Message List Input",
        }),
        InputBuilder.Data({
            id: "dataInput",
            displayName: "Data Input",
        }),
        InputBuilder.DataList({
            id: "dataListInput",
            displayName: "Data List Input",
        }),
    ],
    outputs: [
        OutputBuilder.Message({
            id: "messageOutput",
            displayName: "Message Output",
        }),
        OutputBuilder.Text({
            id: "textOutput",
            displayName: "Text Output",
        }),
        OutputBuilder.LanguageModel({
            id: "languageModelOutput",
            displayName: "Language Model Output",
        }),
        OutputBuilder.Document({
            id: "documentOutput",
            displayName: "Document Output",
        }),
        OutputBuilder.Retriever({
            id: "retrieverOutput",
            displayName: "Retriever Output",
        }),
        OutputBuilder.Embeddings({
            id: "embeddingsOutput",
            displayName: "Embeddings Output",
        }),
        OutputBuilder.VectorStore({
            id: "vectorStoreOutput",
            displayName: "Vector Store Output",
        }),
        OutputBuilder.Tool({
            id: "toolOutput",
            displayName: "Tool Output",
        }),
        OutputBuilder.DataFrame({
            id: "dataFrameOutput",
            displayName: "DataFrame Output",
        }),
        OutputBuilder.Unresolved({
            id: "unresolvedOutput",
            displayName: "Unresolved Output",
            polymorphicGroupId: "unresolvedGroup",
        }),
        OutputBuilder.UnresolvedScalar({
            id: "unresolvedScalarOutput",
            displayName: "Unresolved Scalar Output",
            polymorphicGroupId: "unresolvedScalarGroup",
        }),
        OutputBuilder.UnresolvedList({
            id: "unresolvedListOutput",
            displayName: "Unresolved List Output",
            polymorphicGroupId: "unresolvedListGroup",
        }),
        OutputBuilder.ToolList({
            id: "toolListOutput",
            displayName: "Tool List Output",
        }),
        OutputBuilder.MessageList({
            id: "messageListOutput",
            displayName: "Message List Output",
        }),
        OutputBuilder.Data({
            id: "dataOutput",
            displayName: "Data Output",
        }),
        OutputBuilder.DataList({
            id: "dataListOutput",
            displayName: "Data List Output",
        }),
    ],
});
