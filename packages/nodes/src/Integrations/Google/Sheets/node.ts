import { RuntimeNode, defineLoaders, type InferOutputs } from "@pretzel-graph/node-sdk";

import { GoogleDriveClient, GoogleSheetsClient, bareHTTP } from "../client";
import { Google } from "../domain";
import { googleToken, loaderValue, optional } from "../shared";
import { Blueprint } from "./blueprint";
import { a1 } from "./range";
import { buildTools, toRows } from "./tools";


export class Node extends RuntimeNode<typeof Blueprint> {

    static loaders = defineLoaders<typeof Blueprint>()({

        async spreadsheets({ credentials, credentialsAPI, searchQuery, paginationCursor }) {
            const drive = new GoogleDriveClient(bareHTTP(), googleToken(credentialsAPI, credentials.googleSheetsOAuth, "Google Sheets"));

            const q = [
                `mimeType = '${Google.Drive.SPREADSHEET_MIME}'`,
                "trashed = false",
                ...(searchQuery ? [`name contains ${Google.Drive.quote(searchQuery)}`] : []),
            ].join(" and ");

            const { files, nextPageToken } = await drive.files.list({ q, pageSize: 30, pageToken: paginationCursor });

            return {
                options: files.map(f => ({ label: f.name, value: f.id, description: f.modifiedTime, url: f.webViewLink })),
                nextPaginationCursor: nextPageToken,
            };
        },

        // Bound to whichever spreadsheet field the current resource shows.
        async sheets({ fieldValues, credentials, credentialsAPI, searchQuery }) {
            const values = fieldValues as unknown as Record<string, { value: string } | undefined>;

            const spreadsheetId = loaderValue(values.spreadsheet)
                ?? loaderValue(values.appendSpreadsheet)
                ?? loaderValue(values.updateSpreadsheet)
                ?? loaderValue(values.clearSpreadsheet);

            if (!spreadsheetId)
                return { options: [] };

            const sheets = new GoogleSheetsClient(bareHTTP(), googleToken(credentialsAPI, credentials.googleSheetsOAuth, "Google Sheets"));
            const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
            const q = searchQuery?.toLowerCase() ?? "";

            return {
                options: (spreadsheet.sheets ?? [])
                    .map(s => s.properties)
                    .filter(p => !q || p.title.toLowerCase().includes(q))
                    .map(p => ({
                        label:       p.title,
                        value:       p.title,
                        description: p.gridProperties ? `${p.gridProperties.rowCount ?? "?"} × ${p.gridProperties.columnCount ?? "?"}` : undefined,
                    })),
            };
        },
    });


    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        const fields = this.fieldValues;
        const sheets = this.sheets;

        if (fields.isConvertedToTool === true)
            return {
                tools: buildTools(sheets, this.drive),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;

        switch (fields.resource) {

            case "read": {
                const spreadsheetId = required(loaderValue(fields.spreadsheet), "Spreadsheet");
                const { values = [] } = await sheets.values.get({
                    spreadsheetId,
                    range: a1(loaderValue(fields.sheet), optional(fields.range)),
                });

                return {
                    rows: fields.headerRow ? Google.Sheets.rowsToObjects(values) : values,
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            case "append": {
                const spreadsheetId = required(loaderValue(fields.appendSpreadsheet), "Spreadsheet");
                const sheet         = loaderValue(fields.appendSheet);
                const values        = await toRows(sheets, spreadsheetId, sheet, asRows(fields.rows));

                return {
                    result: await sheets.values.append({
                        spreadsheetId,
                        range:            a1(sheet),
                        values,
                        valueInputOption: fields.appendRaw ? "RAW" : "USER_ENTERED",
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            case "update": {
                const spreadsheetId = required(loaderValue(fields.updateSpreadsheet), "Spreadsheet");

                return {
                    result: await sheets.values.update({
                        spreadsheetId,
                        range:            a1(loaderValue(fields.updateSheet), fields.updateRange),
                        values:           asRows(fields.values).map(row => (Array.isArray(row) ? row : Object.values(row)).map(Google.Sheets.toCell)),
                        valueInputOption: fields.updateRaw ? "RAW" : "USER_ENTERED",
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            case "clear": {
                const spreadsheetId = required(loaderValue(fields.clearSpreadsheet), "Spreadsheet");

                return {
                    result: await sheets.values.clear({
                        spreadsheetId,
                        range: a1(loaderValue(fields.clearSheet), optional(fields.clearRange)),
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            case "info":
                return {
                    spreadsheet: await sheets.spreadsheets.get({
                        spreadsheetId: required(loaderValue(fields.infoSpreadsheet), "Spreadsheet"),
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "create":
                return {
                    spreadsheet: await sheets.spreadsheets.create({
                        title:       fields.title,
                        sheetTitles: fields.sheetTitles?.length ? fields.sheetTitles : undefined,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }

        return {};
    }


    #sheets: GoogleSheetsClient | undefined;
    #drive:  GoogleDriveClient  | undefined;

    private get sheets(): GoogleSheetsClient {
        this.#sheets ??= new GoogleSheetsClient(this.httpClientFactory, this.token());
        return this.#sheets;
    }

    private get drive(): GoogleDriveClient {
        this.#drive ??= new GoogleDriveClient(this.httpClientFactory, this.token());
        return this.#drive;
    }

    private token() {
        return googleToken(this.context.credentialsAPI, this.credentials.googleSheetsOAuth, "Google Sheets");
    }
}


function required(value: string | undefined, label: string): string {
    if (!value)
        throw new Error(`Google Sheets: ${label} is required.`);

    return value;
}

function asRows(value: unknown): (unknown[] | Record<string, unknown>)[] {
    if (!Array.isArray(value))
        throw new Error("Google Sheets: rows must be an array.");

    return value.filter(row => Array.isArray(row) || (typeof row === "object" && row !== null));
}
