// `'Sheet name'!A1:B2`, with the sheet quoted the way the API expects.
export function a1(sheet: string | undefined, range?: string): string {
    const sheetPart = sheet?.trim() ? `'${sheet.trim().replace(/'/g, "''")}'` : ""
    const rangePart = range?.trim() ?? ""

    if (sheetPart && rangePart)
        return `${sheetPart}!${rangePart}`

    return sheetPart || rangePart || "A:ZZ"
}
