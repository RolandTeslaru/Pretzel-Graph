import {
    defineBlueprint,
    defineTool,
    defineField,
    defineOutput,
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
        defineField.MultiOption("resource", "Resource", {
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
            defineField.ResourceLoader("spreadsheet", "Spreadsheet", { loaderId: "spreadsheets", placeholder: "Pick a spreadsheet", required: true }),
            defineField.ResourceLoader("sheet", "Sheet", { loaderId: "sheets", dependsOn: ["spreadsheet"], placeholder: "First sheet" }),
            defineField.String("range", "Range", {
                placeholder: "A1:F100",
                tooltip:     "Cells to read. Leave empty for the whole sheet.",
            }),
            defineField.Boolean("headerRow", "First Row is Header", {
                initialValue: true,
                tooltip:      "Return rows as objects keyed by the header.",
            }),
        ],
        outputs: [defineOutput.DataList("rows", "Rows")],
    },

    "resource==append": {
        fields: [
            defineField.ResourceLoader("appendSpreadsheet", "Spreadsheet", { loaderId: "spreadsheets", placeholder: "Pick a spreadsheet", required: true }),
            defineField.ResourceLoader("appendSheet", "Sheet", { loaderId: "sheets", dependsOn: ["appendSpreadsheet"], placeholder: "First sheet" }),
            defineField.Json("rows", "Rows", {
                required: true,
                initialValue: [],
                tooltip: "An array of rows. Each row is an array of cells, or an object keyed by header.",
            }),
            defineField.Boolean("appendRaw", "Raw Values", {
                initialValue: false,
                tooltip:      "Store values as typed instead of parsing them like a user would.",
            }),
        ],
        outputs: [defineOutput.Data("result", "Result")],
    },

    "resource==update": {
        fields: [
            defineField.ResourceLoader("updateSpreadsheet", "Spreadsheet", { loaderId: "spreadsheets", placeholder: "Pick a spreadsheet", required: true }),
            defineField.ResourceLoader("updateSheet", "Sheet", { loaderId: "sheets", dependsOn: ["updateSpreadsheet"], placeholder: "First sheet" }),
            defineField.String("updateRange", "Range", { required: true, placeholder: "A2:C2" }),
            defineField.Json("values", "Values", {
                required: true,
                initialValue: [],
                tooltip: "An array of rows, each an array of cells.",
            }),
            defineField.Boolean("updateRaw", "Raw Values", { initialValue: false }),
        ],
        outputs: [defineOutput.Data("result", "Result")],
    },

    "resource==clear": {
        fields: [
            defineField.ResourceLoader("clearSpreadsheet", "Spreadsheet", { loaderId: "spreadsheets", placeholder: "Pick a spreadsheet", required: true }),
            defineField.ResourceLoader("clearSheet", "Sheet", { loaderId: "sheets", dependsOn: ["clearSpreadsheet"], placeholder: "First sheet" }),
            defineField.String("clearRange", "Range", { placeholder: "A2:Z", tooltip: "Leave empty to clear the whole sheet." }),
        ],
        outputs: [defineOutput.Data("result", "Result")],
    },

    "resource==info": {
        fields: [
            defineField.ResourceLoader("infoSpreadsheet", "Spreadsheet", { loaderId: "spreadsheets", placeholder: "Pick a spreadsheet", required: true }),
        ],
        outputs: [defineOutput.Data("spreadsheet", "Spreadsheet")],
    },

    "resource==create": {
        fields: [
            defineField.String("title", "Title", { required: true }),
            defineField.List("sheetTitles", "Sheet Names", { tooltip: "Leave empty for a single default sheet." }),
        ],
        outputs: [defineOutput.Data("spreadsheet", "Spreadsheet")],
    },


    "isConvertedToTool==true": defineTool({
        fields:  [],
        inputs:  [],
        outputs: [defineOutput.ToolList("tools", "Google Sheets Tools")],
    }),
});
