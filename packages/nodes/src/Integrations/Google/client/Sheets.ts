import type { HTTP } from "@pretzel-graph/node-sdk"

import { withAPIParsing } from "../../../utils"
import { Google } from "../domain"
import { GoogleClient, encodeSegment, type AccessTokenGetter } from "./common"

export const SHEETS_BASE_URL = "https://sheets.googleapis.com/v4"

const Sheets = Google.Sheets

export class GoogleSheetsClient extends GoogleClient {

    constructor(http: HTTP.ClientAPI, getToken: AccessTokenGetter) {
        super(http, SHEETS_BASE_URL, getToken)
    }

    public readonly spreadsheets = {
        get: withAPIParsing(
            Sheets.API.Spreadsheets.Get.Request,
            Sheets.API.Spreadsheets.Get.Response,
            ({ spreadsheetId }) => this.get(`/spreadsheets/${encodeSegment(spreadsheetId)}`, {
                fields: "spreadsheetId,spreadsheetUrl,properties.title,sheets.properties",
            }),
        ),

        create: withAPIParsing(
            Sheets.API.Spreadsheets.Create.Request,
            Sheets.API.Spreadsheets.Create.Response,
            ({ title, sheetTitles }) => this.post("/spreadsheets", {
                properties: { title },
                ...(sheetTitles?.length ? { sheets: sheetTitles.map(t => ({ properties: { title: t } })) } : {}),
            }),
        ),
    }

    public readonly values = {
        get: withAPIParsing(
            Sheets.API.Values.Get.Request,
            Sheets.API.Values.Get.Response,
            ({ spreadsheetId, range, valueRenderOption }) => this.get(
                `/spreadsheets/${encodeSegment(spreadsheetId)}/values/${encodeSegment(range)}`,
                { valueRenderOption },
            ),
        ),

        append: withAPIParsing(
            Sheets.API.Values.Append.Request,
            Sheets.API.Values.Append.Response,
            ({ spreadsheetId, range, values, valueInputOption }) => this.post(
                `/spreadsheets/${encodeSegment(spreadsheetId)}/values/${encodeSegment(range)}:append`,
                { range, majorDimension: "ROWS", values },
                { valueInputOption, insertDataOption: "INSERT_ROWS" },
            ),
        ),

        update: withAPIParsing(
            Sheets.API.Values.Update.Request,
            Sheets.API.Values.Update.Response,
            ({ spreadsheetId, range, values, valueInputOption }) => this.put(
                `/spreadsheets/${encodeSegment(spreadsheetId)}/values/${encodeSegment(range)}`,
                { range, majorDimension: "ROWS", values },
                { valueInputOption },
            ),
        ),

        clear: withAPIParsing(
            Sheets.API.Values.Clear.Request,
            Sheets.API.Values.Clear.Response,
            ({ spreadsheetId, range }) => this.post(
                `/spreadsheets/${encodeSegment(spreadsheetId)}/values/${encodeSegment(range)}:clear`,
                {},
            ),
        ),
    }
}
