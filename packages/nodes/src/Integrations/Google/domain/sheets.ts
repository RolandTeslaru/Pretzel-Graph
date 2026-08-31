import { z } from "zod"

export namespace Sheets {

    export const SheetProperties = z.looseObject({
        sheetId: z.number(),
        title:   z.string(),
        index:   z.number().optional(),
        gridProperties: z.looseObject({
            rowCount:    z.number().optional(),
            columnCount: z.number().optional(),
        }).optional(),
    })

    export const Spreadsheet = z.looseObject({
        spreadsheetId:  z.string(),
        spreadsheetUrl: z.string().optional(),
        properties:     z.looseObject({ title: z.string().optional() }).optional(),
        sheets:         z.array(z.looseObject({ properties: SheetProperties })).optional(),
    })
    export type Spreadsheet = z.infer<typeof Spreadsheet>

    export const Cell = z.union([z.string(), z.number(), z.boolean(), z.null()])
    export type Cell = z.infer<typeof Cell>

    export const ValueRange = z.looseObject({
        range:          z.string().optional(),
        majorDimension: z.string().optional(),
        values:         z.array(z.array(Cell)).optional(),
    })
    export type ValueRange = z.infer<typeof ValueRange>

    export const ValueInputOption = z.enum(["USER_ENTERED", "RAW"])

    export namespace API {

        export namespace Spreadsheets {
            export namespace Get {
                export const Request  = z.object({ spreadsheetId: z.string() })
                export const Response = Spreadsheet
            }

            export namespace Create {
                export const Request = z.object({
                    title:       z.string(),
                    sheetTitles: z.array(z.string()).optional(),
                })
                export const Response = Spreadsheet
            }
        }

        export namespace Values {
            export namespace Get {
                export const Request = z.object({
                    spreadsheetId:     z.string(),
                    range:             z.string(),
                    valueRenderOption: z.enum(["FORMATTED_VALUE", "UNFORMATTED_VALUE", "FORMULA"]).default("UNFORMATTED_VALUE"),
                })
                export const Response = ValueRange
            }

            export namespace Append {
                export const Request = z.object({
                    spreadsheetId:    z.string(),
                    range:            z.string(),
                    values:           z.array(z.array(Cell)),
                    valueInputOption: ValueInputOption.default("USER_ENTERED"),
                })
                export const Response = z.looseObject({
                    spreadsheetId: z.string(),
                    tableRange:    z.string().optional(),
                    updates:       z.looseObject({
                        updatedRange:   z.string().optional(),
                        updatedRows:    z.number().optional(),
                        updatedColumns: z.number().optional(),
                        updatedCells:   z.number().optional(),
                    }).optional(),
                })
            }

            export namespace Update {
                export const Request = z.object({
                    spreadsheetId:    z.string(),
                    range:            z.string(),
                    values:           z.array(z.array(Cell)),
                    valueInputOption: ValueInputOption.default("USER_ENTERED"),
                })
                export const Response = z.looseObject({
                    spreadsheetId:  z.string(),
                    updatedRange:   z.string().optional(),
                    updatedRows:    z.number().optional(),
                    updatedColumns: z.number().optional(),
                    updatedCells:   z.number().optional(),
                })
            }

            export namespace Clear {
                export const Request = z.object({
                    spreadsheetId: z.string(),
                    range:         z.string(),
                })
                export const Response = z.looseObject({
                    spreadsheetId: z.string(),
                    clearedRange:  z.string().optional(),
                })
            }
        }
    }

    // Header row + rows → objects; the shape agents and downstream nodes actually want.
    export function rowsToObjects(values: Cell[][]): Record<string, Cell>[] {
        const [header, ...rows] = values

        if (!header)
            return []

        const keys = header.map((cell, index) => String(cell ?? `column_${index + 1}`))

        return rows.map(row => Object.fromEntries(keys.map((key, index) => [key, row[index] ?? null])))
    }

    // Objects → rows in header order; unknown keys are appended as new columns.
    export function objectsToRows(objects: Record<string, unknown>[], header: Cell[]): { header: Cell[], rows: Cell[][] } {
        const keys = header.map(String)

        for (const object of objects)
            for (const key of Object.keys(object))
                if (!keys.includes(key))
                    keys.push(key)

        const rows = objects.map(object => keys.map(key => toCell(object[key])))

        return { header: keys, rows }
    }

    export function toCell(value: unknown): Cell {
        if (value === null || value === undefined)
            return null

        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
            return value

        return JSON.stringify(value)
    }
}
