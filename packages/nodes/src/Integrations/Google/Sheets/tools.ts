import { tool } from "@langchain/core/tools";
import { ToolBudget } from "@pretzel-graph/node-sdk";
import { z } from "zod/v3";

import type { GoogleDriveClient, GoogleSheetsClient } from "../client";
import { Google } from "../domain";
import { a1 } from "./range";


export function buildTools(sheets: GoogleSheetsClient, drive: GoogleDriveClient) {

    const findSpreadsheets = tool(
        async ({ query, limit }) => {
            const q = [
                `mimeType = '${Google.Drive.SPREADSHEET_MIME}'`,
                "trashed = false",
                ...(query ? [`name contains ${Google.Drive.quote(query)}`] : []),
            ].join(" and ");

            const { files } = await drive.files.list({ q, pageSize: limit });

            return ToolBudget.list("spreadsheets", files.map(f => ({ id: f.id, name: f.name, modifiedTime: f.modifiedTime, url: f.webViewLink })));
        },
        {
            name:        "sheets_find_spreadsheets",
            description: "Find spreadsheets in the connected Google Drive by name. Returns ids to use with the other sheets tools.",
            schema: z.object({
                query: z.string().optional().describe("Part of the spreadsheet name. Omit for the most recent ones."),
                limit: z.number().int().min(1).max(50).default(10),
            }),
        },
    );

    const describe = tool(
        async ({ spreadsheetId }) => {
            const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });

            return ToolBudget.value({
                spreadsheetId: spreadsheet.spreadsheetId,
                title:         spreadsheet.properties?.title,
                url:           spreadsheet.spreadsheetUrl,
                sheets:        (spreadsheet.sheets ?? []).map(s => ({
                    title:   s.properties.title,
                    rows:    s.properties.gridProperties?.rowCount,
                    columns: s.properties.gridProperties?.columnCount,
                })),
            });
        },
        {
            name:        "sheets_describe_spreadsheet",
            description: "Get a spreadsheet's title and the names and sizes of its sheets (tabs).",
            schema: z.object({ spreadsheetId: z.string() }),
        },
    );

    const read = tool(
        async ({ spreadsheetId, sheet, range, headerRow }) => {
            const { values = [] } = await sheets.values.get({ spreadsheetId, range: a1(sheet, range) });

            const rows: unknown[] = headerRow ? Google.Sheets.rowsToObjects(values) : values;

            return ToolBudget.list("rows", rows, { hint: "Read a narrower range." });
        },
        {
            name:        "sheets_read_rows",
            description: "Read cells from a sheet. With headerRow (default) the first row names the columns and each row comes back as an object.",
            schema: z.object({
                spreadsheetId: z.string(),
                sheet:         z.string().optional().describe("Sheet (tab) name. Omit for the first sheet."),
                range:         z.string().optional().describe("A1 range inside the sheet, e.g. A1:F100. Omit for everything."),
                headerRow:     z.boolean().default(true),
            }),
        },
    );

    const append = tool(
        async ({ spreadsheetId, sheet, rows }) => {
            const values = await toRows(sheets, spreadsheetId, sheet, rows);

            return ToolBudget.value(await sheets.values.append({ spreadsheetId, range: a1(sheet), values }));
        },
        {
            name:        "sheets_append_rows",
            description: "Append rows after the last row of a sheet. Rows may be arrays of cells, or objects whose keys match the header row.",
            schema: z.object({
                spreadsheetId: z.string(),
                sheet:         z.string().optional().describe("Sheet (tab) name. Omit for the first sheet."),
                rows:          z.array(z.union([z.array(z.any()), z.record(z.any())])).min(1),
            }),
        },
    );

    const update = tool(
        async ({ spreadsheetId, sheet, range, values }) => ToolBudget.value(
            await sheets.values.update({
                spreadsheetId,
                range:  a1(sheet, range),
                values: values.map(row => row.map(Google.Sheets.toCell)),
            }),
        ),
        {
            name:        "sheets_update_range",
            description: "Overwrite a rectangular range of cells with the given rows.",
            schema: z.object({
                spreadsheetId: z.string(),
                sheet:         z.string().optional(),
                range:         z.string().describe("A1 range to overwrite, e.g. B2:D4."),
                values:        z.array(z.array(z.any())).min(1),
            }),
        },
    );

    return [findSpreadsheets, describe, read, append, update];
}


// Objects need the header to know the column order; arrays go through untouched.
export async function toRows(
    sheets: GoogleSheetsClient,
    spreadsheetId: string,
    sheet: string | undefined,
    rows: (unknown[] | Record<string, unknown>)[],
): Promise<Google.Sheets.Cell[][]> {
    const objects = rows.filter((row): row is Record<string, unknown> => !Array.isArray(row) && typeof row === "object" && row !== null);

    if (objects.length === 0)
        return rows.map(row => (row as unknown[]).map(Google.Sheets.toCell));

    const { values = [] } = await sheets.values.get({ spreadsheetId, range: a1(sheet, "1:1") });
    const header = values[0] ?? [];

    const converted = Google.Sheets.objectsToRows(objects, header);

    if (header.length === 0)
        return [converted.header, ...converted.rows];

    if (converted.header.length > header.length) {
        const added = converted.header.slice(header.length);

        await sheets.values.update({
            spreadsheetId,
            range:  a1(sheet, `${columnLetter(header.length + 1)}1`),
            values: [added],
        });
    }

    return converted.rows;
}

function columnLetter(index: number): string {
    let letters = "";

    while (index > 0) {
        const rem = (index - 1) % 26;
        letters = String.fromCharCode(65 + rem) + letters;
        index = Math.floor((index - 1) / 26);
    }

    return letters;
}
