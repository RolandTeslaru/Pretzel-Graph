import {
    defineBlueprint,
    defineTool,
    FieldBuilder,
    OutputBuilder,
} from "@pretzel-graph/node-sdk";
import { GoogleSheetsOAuth } from "@pretzel-graph/nodes/Credentials/GoogleOAuth";


export const Blueprint = defineBlueprint({
    id:              "Integrations.Google.Sheets",
    credentials:     [GoogleSheetsOAuth],
    displayName:     "Google Sheets",
    description:     "Reads and writes rows in a Google Sheets spreadsheet.",
    icon:            "GoogleSheets",
    accent:          "port-DataList",
    proxyCompatible: true,
    toolCompatible:  true,

    fields: [
        FieldBuilder.MultiOption("resource", "Resource", {
            options: [
                { value: "read",   displayName: "Read Rows",    description: "Read a range as rows."                         },
                { value: "append", displayName: "Append Rows",  description: "Add rows after the last one."                  },
                { value: "update", displayName: "Update Range", description: "Overwrite the cells in a range."               },
                { value: "clear",  displayName: "Clear Range",  description: "Empty the cells in a range."                   },
                { value: "info",   displayName: "Spreadsheet",  description: "Title, URL and the list of sheets."            },
                { value: "create", displayName: "Create",       description: "Create a new spreadsheet."                     },
            ],
            initialValue: "read",
        }),
    ],
    inputs:  [],
    outputs: [],


    "resource==read": {
        fields: [
            FieldBuilder.ResourceLoader("spreadsheet", "Spreadsheet", { loaderId: "spreadsheets", placeholder: "Pick a spreadsheet", required: true }),
            FieldBuilder.ResourceLoader("sheet", "Sheet", { loaderId: "sheets", dependsOn: ["spreadsheet"], placeholder: "First sheet" }),
            FieldBuilder.String("range", "Range", {
                placeholder: "A1:F100",
                tooltip:     "Cells to read. Leave empty for the whole sheet.",
            }),
            FieldBuilder.Boolean("headerRow", "First Row is Header", {
                initialValue: true,
                tooltip:      "Return rows as objects keyed by the header.",
            }),
        ],
        outputs: [OutputBuilder.DataList("rows", "Rows")],
    },

    "resource==append": {
        fields: [
            FieldBuilder.ResourceLoader("appendSpreadsheet", "Spreadsheet", { loaderId: "spreadsheets", placeholder: "Pick a spreadsheet", required: true }),
            FieldBuilder.ResourceLoader("appendSheet", "Sheet", { loaderId: "sheets", dependsOn: ["appendSpreadsheet"], placeholder: "First sheet" }),
            FieldBuilder.Json("rows", "Rows", {
                required: true,
                initialValue: [],
                tooltip: "An array of rows. Each row is an array of cells, or an object keyed by header.",
            }),
            FieldBuilder.Boolean("appendRaw", "Raw Values", {
                initialValue: false,
                tooltip:      "Store values as typed instead of parsing them like a user would.",
            }),
        ],
        outputs: [OutputBuilder.Data("result", "Result")],
    },

    "resource==update": {
        fields: [
            FieldBuilder.ResourceLoader("updateSpreadsheet", "Spreadsheet", { loaderId: "spreadsheets", placeholder: "Pick a spreadsheet", required: true }),
            FieldBuilder.ResourceLoader("updateSheet", "Sheet", { loaderId: "sheets", dependsOn: ["updateSpreadsheet"], placeholder: "First sheet" }),
            FieldBuilder.String("updateRange", "Range", { required: true, placeholder: "A2:C2" }),
            FieldBuilder.Json("values", "Values", {
                required: true,
                initialValue: [],
                tooltip: "An array of rows, each an array of cells.",
            }),
            FieldBuilder.Boolean("updateRaw", "Raw Values", { initialValue: false }),
        ],
        outputs: [OutputBuilder.Data("result", "Result")],
    },

    "resource==clear": {
        fields: [
            FieldBuilder.ResourceLoader("clearSpreadsheet", "Spreadsheet", { loaderId: "spreadsheets", placeholder: "Pick a spreadsheet", required: true }),
            FieldBuilder.ResourceLoader("clearSheet", "Sheet", { loaderId: "sheets", dependsOn: ["clearSpreadsheet"], placeholder: "First sheet" }),
            FieldBuilder.String("clearRange", "Range", { placeholder: "A2:Z", tooltip: "Leave empty to clear the whole sheet." }),
        ],
        outputs: [OutputBuilder.Data("result", "Result")],
    },

    "resource==info": {
        fields: [
            FieldBuilder.ResourceLoader("infoSpreadsheet", "Spreadsheet", { loaderId: "spreadsheets", placeholder: "Pick a spreadsheet", required: true }),
        ],
        outputs: [OutputBuilder.Data("spreadsheet", "Spreadsheet")],
    },

    "resource==create": {
        fields: [
            FieldBuilder.String("title", "Title", { required: true }),
            FieldBuilder.List("sheetTitles", "Sheet Names", { tooltip: "Leave empty for a single default sheet." }),
        ],
        outputs: [OutputBuilder.Data("spreadsheet", "Spreadsheet")],
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [OutputBuilder.ToolList("tools", "Google Sheets Tools")],
    }),
});
