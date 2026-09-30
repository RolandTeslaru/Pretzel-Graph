import {
    defineBlueprint,
    defineTool,
    defineField,
    defineOutput,
} from "@pretzel-graph/node-sdk";
import { Tavily } from "@pretzel-graph/nodes/Credentials/Tavily";


const researchSettingFields = () => [
    defineField.MultiOption("model", "Model", {
        options: [
            { value: "auto", displayName: "Auto" },
            { value: "mini", displayName: "Mini" },
            { value: "pro",  displayName: "Pro"  },
        ],
        initialValue: "auto",
        tooltip:      "Mini is faster for focused questions. Pro researches broad topics more thoroughly and uses more Tavily credits.",
    }),
    defineField.List("includeDomains", "Only These Domains", {
        advanced: true,
        tooltip:  "Restricts sources to these domains, up to 20.",
    }),
    defineField.List("excludeDomains", "Exclude Domains", {
        advanced: true,
        tooltip:  "Never uses sources from these domains, up to 20.",
    }),
] as const;


export const Blueprint = defineBlueprint({
    id:             "Integrations.Tavily.Research",
    credentials:    [Tavily],
    displayName:    "Tavily Research",
    description:    "Researches a question in depth using Tavily and returns a cited report or a structured result.",
    icon:           "Tavily",
    accent:         "port-DataList",
    toolCompatible: true,

    fields: [
        defineField.String("input", "Question", {
            required:    true,
            multiline:   true,
            placeholder: "What should be researched?",
        }),
        defineField.MultiOption("outputFormat", "Output", {
            options: [
                { value: "report",     displayName: "Report"     },
                { value: "structured", displayName: "Structured" },
            ],
            initialValue: "report",
            variant:      "tab",
        }),
        ...researchSettingFields(),
    ],
    inputs:  [],
    outputs: [],


    "outputFormat==report": {
        fields: [
            defineField.MultiOption("outputLength", "Length", {
                options: [
                    { value: "short",    displayName: "Short"    },
                    { value: "standard", displayName: "Standard" },
                    { value: "long",     displayName: "Long"     },
                ],
                initialValue: "standard",
            }),
            defineField.MultiOption("citationFormat", "Citations", {
                options: [
                    { value: "numbered", displayName: "Numbered" },
                    { value: "apa",      displayName: "APA"      },
                    { value: "mla",      displayName: "MLA"      },
                    { value: "chicago",  displayName: "Chicago"  },
                ],
                initialValue: "numbered",
            }),
        ],
        outputs: [
            defineOutput.Data("report", "Report", {
                tooltip: "The research report, with citations.",
            }),
            defineOutput.DataList("sources", "Sources", {
                tooltip: "The sources the report cites, each with a title and url.",
            }),
        ],
    },


    "outputFormat==structured": {
        fields: [
            defineField.Json("outputSchema", "Output Schema", {
                required: true,
                tooltip:  "A JSON Schema object describing the result, e.g. { \"properties\": { \"founded\": { \"type\": \"integer\" } } }.",
            }),
        ],
        outputs: [
            defineOutput.Data("result", "Result", {
                tooltip: "The research result, shaped by the output schema.",
            }),
            defineOutput.DataList("sources", "Sources", {
                tooltip: "The sources the result is based on, each with a title and url.",
            }),
        ],
    },


    "isConvertedToTool==true": defineTool({
        fields:  researchSettingFields(),
        inputs:  [],
        outputs: [
            defineOutput.Tool("tool", "Research Tool", {
                tooltip: "A tool that can be called to research a question in depth.",
            }),
        ],
    }),
});
