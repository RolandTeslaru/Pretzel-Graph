import { defineOAuth2Credential, defineField, googleOAuth2Provider } from "@pretzel-graph/node-sdk"

// One credential per product family, so the consent screen asks only for what the node touches.
function googleCredential<const TId extends string>(id: TId, displayName: string, scopes: string[], icon?: string) {
    return defineOAuth2Credential({
        id,
        displayName,
        icon:     icon ?? "Google",
        provider: googleOAuth2Provider([
            "https://www.googleapis.com/auth/userinfo.email",
            ...scopes,
        ]),
        fields: [
            defineField.String("clientId", "Client ID", {
                required: true,
                tooltip:  "OAuth client ID from Google Cloud Console → APIs & Services → Credentials.",
            }),
            defineField.Password("clientSecret", "Client Secret", {
                required: true,
                tooltip:  "Client secret of the same OAuth client.",
            }),
        ],
    })
}

export const GoogleGmailOAuth = googleCredential("googleGmailOAuth", "Gmail", [
    "https://www.googleapis.com/auth/gmail.modify",
], "Gmail")

// The Drive scope is what lets the spreadsheet picker list files — names and ids, never content.
export const GoogleSheetsOAuth = googleCredential("googleSheetsOAuth", "Google Sheets", [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.metadata.readonly",
], "GoogleSheets")

export const GoogleDriveOAuth = googleCredential("googleDriveOAuth", "Google Drive", [
    "https://www.googleapis.com/auth/drive",
], "GoogleDrive")

export const GoogleCalendarOAuth = googleCredential("googleCalendarOAuth", "Google Calendar", [
    "https://www.googleapis.com/auth/calendar",
], "GoogleCalendar")
