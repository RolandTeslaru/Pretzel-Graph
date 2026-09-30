import {
    defineBlueprint,
    defineTool,
    defineField,
    defineOutput,
} from "@pretzel-graph/node-sdk";
import { Tavily } from "@pretzel-graph/nodes/Credentials/Tavily";


const searchSettingFields = () => [
    defineField.MultiOption("searchDepth", "Search Depth", {
        options: [
            { value: "ultra-fast", displayName: "Ultra Fast" },
            { value: "fast",       displayName: "Fast"       },
            { value: "basic",      displayName: "Basic"      },
            { value: "advanced",   displayName: "Advanced"   },
        ],
        initialValue: "basic",
        tooltip:      "Faster depths answer sooner with shorter snippets. Advanced costs more Tavily credits but returns the most relevant content.",
    }),
    defineField.Integer("maxResults", "Max Results", {
        initialValue: 5,
        min:          1,
        max:          20,
    }),
    defineField.MultiOption("answerMode", "Answer", {
        options: [
            { value: "off",      displayName: "Off"      },
            { value: "basic",    displayName: "Basic"    },
            { value: "advanced", displayName: "Detailed" },
        ],
        initialValue: "off",
        tooltip:      "Tavily writes an answer to the query from the search results.",
    }),
    defineField.MultiOption("rawContent", "Page Content", {
        options: [
            { value: "off",      displayName: "Snippet"  },
            { value: "markdown", displayName: "Markdown" },
            { value: "text",     displayName: "Text"     },
        ],
        initialValue: "off",
        tooltip:      "Snippet returns the most relevant excerpt. Markdown and Text return each page's full content.",
    }),
    defineField.Boolean("includeImages", "Include Images", {
        initialValue: false,
        advanced:     true,
        tooltip:      "Returns images related to the query, with descriptions.",
    }),
    defineField.List("includeDomains", "Only These Domains", {
        advanced: true,
        tooltip:  "Restricts results to these domains, e.g. wikipedia.org.",
    }),
    defineField.List("excludeDomains", "Exclude Domains", {
        advanced: true,
        tooltip:  "Removes results from these domains.",
    }),
    defineField.Boolean("exactMatch", "Exact Match", {
        initialValue: false,
        advanced:     true,
        tooltip:      "Only returns results containing the quoted phrases in the query exactly.",
    }),
    defineField.Boolean("safeSearch", "Safe Search", {
        initialValue: false,
        advanced:     true,
        tooltip:      "Filters out adult and unsafe content.",
    }),
] as const;


const defineImagesOutputBranch = () => ({
    outputs: [
        defineOutput.DataList("images", "Images", {
            tooltip: "Images related to the query, each with a url and description.",
        }),
    ],
});


export const Blueprint = defineBlueprint({
    id:             "Integrations.Tavily.Search",
    credentials:    [Tavily],
    displayName:    "Tavily Search",
    description:    "Searches the web using Tavily and returns ranked results, with an optional written answer.",
    icon:           "Tavily",
    accent:         "port-DataList",
    toolCompatible: true,

    fields: [
        defineField.String("query", "Query", {
            required:    true,
            placeholder: "What do you want to search for?",
        }),
        defineField.MultiOption("topic", "Topic", {
            options: [
                { value: "general", displayName: "General" },
                { value: "news",    displayName: "News"    },
                { value: "finance", displayName: "Finance" },
            ],
            initialValue: "general",
            variant:      "tab",
        }),
        defineField.MultiOption("timeRange", "Time Range", {
            options: [
                { value: "any",    displayName: "Any time"   },
                { value: "day",    displayName: "Past day"   },
                { value: "week",   displayName: "Past week"  },
                { value: "month",  displayName: "Past month" },
                { value: "year",   displayName: "Past year"  },
            ],
            initialValue: "any",
        }),
        ...searchSettingFields(),
        defineField.CalendarRange("dateRange", "Published Between", {
            advanced:    true,
            placeholder: "Choose dates",
            tooltip:     "Only returns results published within these dates. Overrides Time Range when set.",
        }),
        defineField.Integer("chunksPerSource", "Excerpts per Result", {
            initialValue: 3,
            min:          1,
            max:          3,
            advanced:     true,
            tooltip:      "How many relevant excerpts each result includes with Advanced depth.",
        }),
        defineField.String("country", "Country", {
            advanced:    true,
            placeholder: "united states",
            tooltip:     "Boosts results from this country for general searches. Use the full country name in lowercase.",
        }),
    ],
    inputs:  [],
    outputs: [
        defineOutput.DataList("documents", "Documents", {
            tooltip: "Search results as Document objects (pageContent + metadata).",
        }),
    ],


    "answerMode==off": {
        "includeImages==true": defineImagesOutputBranch(),
    },


    "answerMode!=off": {
        outputs: [
            defineOutput.Data("answer", "Answer", {
                tooltip: "Tavily's answer to the query, written from the search results.",
            }),
        ],

        "includeImages==true": defineImagesOutputBranch(),
    },


    "isConvertedToTool==true": defineTool({
        fields:  searchSettingFields(),
        inputs:  [],
        outputs: [
            defineOutput.Tool("tool", "Search Tool", {
                tooltip: "A tool that can be called to perform a search with the specified query.",
            }),
        ],
    }),
});
