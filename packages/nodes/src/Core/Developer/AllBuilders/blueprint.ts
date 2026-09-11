import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Core.Developer.AllBuilders",
    displayName: "All Builders",
    description: "A developer node showcasing all available field, input, and output builders.",
    icon: "Rocket",
    accent: "utility",
    fields: [
        defineField.String("stringField", "String Field", {
            initialValue: "Hello World",
            placeholder: "Enter text..."
        }),
        defineField.String("multilineStringField", "Multiline String Field", {
            initialValue: "Line 1\nLine 2",
            multiline: true
        }),
        defineField.Integer("integerField", "Integer Field", {
            initialValue: 42
        }),
        defineField.Integer("integerSliderField", "Integer Slider Field", {
            initialValue: 50,
            min: 0,
            max: 100,
            slider: true
        }),
        defineField.Float("floatField", "Float Field", {
            initialValue: 3.14
        }),
        defineField.Float("floatSliderField", "Float Slider Field", {
            initialValue: 0.5,
            min: 0,
            max: 1,
            step: 0.01,
            slider: true
        }),
        defineField.Boolean("booleanField", "Boolean Field", {
            initialValue: true
        }),
        defineField.MultiOption("multiOptionSelectField", "MultiOption Select", {
            options: [
                { value: "Option A" },
                { value: "Option B" },
                { value: "Option C" },
            ],

            initialValue: "Option A"
        }),
        defineField.MultiOption("multiOptionTabField", "MultiOption Tab", {
            options: [
                { value: "Tab 1" },
                { value: "Tab 2" },
            ],

            initialValue: "Tab 1",
            variant: "tab"
        }),
        defineField.File("fileField", "File Field", {
            fileTypes: [".txt", ".json", ".md"]
        }),
        defineField.List("listField", "List Field", {
            initialValue: ["Item 1", "Item 2"]
        }),
        defineField.Json("jsonField", "JSON Field", {
            initialValue: { key: "value" }
        }),
        defineField.Password("passwordField", "Password Field", {}),
        defineField.Script("scriptField", "Script Field", {
            initialValue: "console.log('Hello');"
        }),
    ],
    inputs: [
        defineInput.Message("messageInput", "Message Input", {
            required: true
        }),
        defineInput.LanguageModel("languageModelInput", "Language Model Input", {
            required: true
        }),
        defineInput.Document("documentInput", "Document Input", {
            required: true
        }),
        defineInput.Retriever("retrieverInput", "Retriever Input", {
            required: true
        }),
        defineInput.Embeddings("embeddingsInput", "Embeddings Input", {
            required: true
        }),
        defineInput.VectorStore("vectorStoreInput", "Vector Store Input", {
            required: true
        }),
        defineInput.Tool("toolInput", "Tool Input", {
            required: true
        }),
        defineInput.Unresolved("unresolvedInput", "Unresolved Input", {
            polymorphicGroupId: "unresolvedGroup",
            required: true
        }),
        defineInput.UnresolvedScalar("unresolvedScalarInput", "Unresolved Scalar Input", {
            polymorphicGroupId: "unresolvedScalarGroup",
            required: true
        }),
        defineInput.UnresolvedList("unresolvedListInput", "Unresolved List Input", {
            polymorphicGroupId: "unresolvedListGroup",
            required: true
        }),
        defineInput.ToolList("toolListInput", "Tool List Input", {
            required: true
        }),
        defineInput.MessageList("messageListInput", "Message List Input", {
            required: true
        }),
        defineInput.Data("dataInput", "Data Input", {
            required: true
        }),
        defineInput.DataList("dataListInput", "Data List Input", {
            required: true
        }),
    ],
    outputs: [
        defineOutput.Message("messageOutput", "Message Output", {}),
        defineOutput.Text("textOutput", "Text Output", {}),
        defineOutput.LanguageModel("languageModelOutput", "Language Model Output", {}),
        defineOutput.Document("documentOutput", "Document Output", {}),
        defineOutput.Retriever("retrieverOutput", "Retriever Output", {}),
        defineOutput.Embeddings("embeddingsOutput", "Embeddings Output", {}),
        defineOutput.VectorStore("vectorStoreOutput", "Vector Store Output", {}),
        defineOutput.Tool("toolOutput", "Tool Output", {}),
        defineOutput.DataFrame("dataFrameOutput", "DataFrame Output", {}),
        defineOutput.Unresolved("unresolvedOutput", "Unresolved Output", {
            polymorphicGroupId: "unresolvedGroup"
        }),
        defineOutput.UnresolvedScalar("unresolvedScalarOutput", "Unresolved Scalar Output", {
            polymorphicGroupId: "unresolvedScalarGroup"
        }),
        defineOutput.UnresolvedList("unresolvedListOutput", "Unresolved List Output", {
            polymorphicGroupId: "unresolvedListGroup"
        }),
        defineOutput.ToolList("toolListOutput", "Tool List Output", {}),
        defineOutput.MessageList("messageListOutput", "Message List Output", {}),
        defineOutput.Data("dataOutput", "Data Output", {}),
        defineOutput.DataList("dataListOutput", "Data List Output", {}),
    ],
});
