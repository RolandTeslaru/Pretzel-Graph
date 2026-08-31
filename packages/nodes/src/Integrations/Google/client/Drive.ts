import type { HTTP } from "@pretzel-graph/node-sdk"

import { withAPIParsing } from "../../../utils"
import { Google } from "../domain"
import { GoogleClient, encodeSegment, type AccessTokenGetter } from "./common"

export const DRIVE_BASE_URL = "https://www.googleapis.com/drive/v3"

const Drive = Google.Drive

export class GoogleDriveClient extends GoogleClient {

    constructor(http: HTTP.ClientAPI, getToken: AccessTokenGetter) {
        super(http, DRIVE_BASE_URL, getToken)
    }

    public readonly files = {
        list: withAPIParsing(
            Drive.API.Files.List.Request,
            Drive.API.Files.List.Response,
            (query) => this.get("/files", {
                ...query,
                fields: `nextPageToken,files(${Drive.FILE_FIELDS})`,
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
            }),
        ),

        get: withAPIParsing(
            Drive.API.Files.Get.Request,
            Drive.API.Files.Get.Response,
            ({ fileId }) => this.getFile(fileId),
        ),

        // Text only. A binary file is an error, not a base64 payload — nothing
        // binary belongs on a port until a real File value exists.
        readText: withAPIParsing(
            Drive.API.Files.ReadText.Request,
            Drive.API.Files.ReadText.Response,
            async ({ fileId, exportMimeType }) => {
                const file = await this.getFile(fileId)

                const exportAs = Drive.defaultExportMime(file.mimeType)
                    ? (exportMimeType ?? Drive.defaultExportMime(file.mimeType)!)
                    : undefined

                const mimeType = exportAs ?? file.mimeType

                if (!Drive.isTextual(mimeType))
                    throw new Error(`"${file.name}" is ${mimeType}, which is not a text format. Only text files and exported Google documents can be read.`)

                const bytes = exportAs
                    ? await this.bytes(`/files/${encodeSegment(fileId)}/export`, { mimeType: exportAs })
                    : await this.bytes(`/files/${encodeSegment(fileId)}`, { alt: "media", supportsAllDrives: true })

                return {
                    file,
                    mimeType,
                    text: bytes.toString("utf8"),
                }
            },
        ),

        createFolder: withAPIParsing(
            Drive.API.Files.CreateFolder.Request,
            Drive.API.Files.CreateFolder.Response,
            ({ name, parentId }) => this.post("/files", {
                name,
                mimeType: Drive.FOLDER_MIME,
                ...(parentId ? { parents: [parentId] } : {}),
            }, { fields: Drive.FILE_FIELDS, supportsAllDrives: true }),
        ),

        move: withAPIParsing(
            Drive.API.Files.Move.Request,
            Drive.API.Files.Move.Response,
            async ({ fileId, parentId }) => {
                const file = await this.getFile(fileId)

                return this.patch(`/files/${encodeSegment(fileId)}`, {}, {
                    addParents:    parentId,
                    removeParents: (file.parents ?? []).join(","),
                    fields:        Drive.FILE_FIELDS,
                    supportsAllDrives: true,
                })
            },
        ),

        trash: withAPIParsing(
            Drive.API.Files.Trash.Request,
            Drive.API.Files.Trash.Response,
            ({ fileId }) => this.patch(`/files/${encodeSegment(fileId)}`, { trashed: true }, {
                fields: Drive.FILE_FIELDS,
                supportsAllDrives: true,
            }),
        ),
    }

    public readonly permissions = {
        create: withAPIParsing(
            Drive.API.Permissions.Create.Request,
            Drive.API.Permissions.Create.Response,
            ({ fileId, sendNotificationEmail, ...permission }) => this.post(
                `/files/${encodeSegment(fileId)}/permissions`,
                permission,
                { sendNotificationEmail, supportsAllDrives: true },
            ),
        ),
    }

    private getFile(fileId: string): Promise<Google.Drive.File> {
        return this.get(`/files/${encodeSegment(fileId)}`, {
            fields: Drive.FILE_FIELDS,
            supportsAllDrives: true,
        }).then(Drive.File.parse)
    }

    private async bytes(path: string, params: object): Promise<Buffer> {
        const data = await this.http.get<ArrayBuffer>(path, { params, responseType: "arraybuffer" })

        return Buffer.from(data)
    }
}
