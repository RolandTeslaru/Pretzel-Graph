import {
    defineBlueprint,
    defineTool,
    defineField,
    defineOutput,
} from "@pretzel-graph/node-sdk";
import { Tavily } from "@pretzel-graph/nodes/Credentials/Tavily";


const extractSettingFields = () => [
    defineField.MultiOption("extractDepth", "Extract Depth", {
        options: [
            { value: "basic",    displayName: "Basic"    },
            { value: "advanced", displayName: "Advanced" },
        ],
        initialValue: "basic",
        tooltip:      "Advanced also reads tables and embedded content, and costs more Tavily credits.",
    }),
    defineField.MultiOption("format", "Format", {
        options: [
            { value: "markdown", displayName: "Markdown" },
            { value: "text",     displayName: "Text"     },
        ],
        initialValue: "markdown",
        variant:      "tab",
    }),
    defineField.Boolean("includeImages", "Include Images", {
        initialValue: false,
        advanced:     true,
        tooltip:      "Adds the image urls found on each page.",
    }),
] as const;


export const Blueprint = defineBlueprint({
    id:             "Integrations.Tavily.Extract",
    credentials:    [Tavily],
    displayName:    "Tavily Extract",
    description:    "Reads web pages using Tavily and returns their main content as clean markdown or text.",
    icon:           "Tavily",
    accent:         "port-DataList",
    toolCompatible: true,

    fields: [
        defineField.List("urls", "URLs", {
            required: true,
            tooltip:  "Up to 20 page urls to read.",
        }),
        defineField.String("query", "Focus", {
            placeholder: "Optional: what you are looking for",
            tooltip:     "Keeps only the parts of each page relevant to this text.",
        }),
        defineField.Integer("chunksPerSource", "Excerpts per Page", {
            initialValue: 3,
            min:          1,
            max:          5,
            advanced:     true,
            tooltip:      "How many relevant excerpts to keep from each page when a focus is set.",
        }),
        ...extractSettingFields(),
    ],
    inputs:  [],
    outputs: [
        defineOutput.DataList("pages", "Pages", {
            tooltip: "Each page as a Document object (pageContent + metadata).",
        }),
        defineOutput.DataList("failures", "Failures", {
            tooltip: "Urls that could not be read, each with its error.",
        }),
    ],


    "isConvertedToTool==true": defineTool({
        fields:  extractSettingFields(),
        inputs:  [],
        outputs: [
            defineOutput.Tool("tool", "Extract Tool", {
                tooltip: "A tool that can be called to read the content of web pages.",
            }),
        ],
    }),
});
