import { z } from "zod"

export namespace Drive {

    export const FOLDER_MIME      = "application/vnd.google-apps.folder"
    export const SPREADSHEET_MIME = "application/vnd.google-apps.spreadsheet"
    export const DOCUMENT_MIME    = "application/vnd.google-apps.document"
    export const SLIDES_MIME      = "application/vnd.google-apps.presentation"

    export const FILE_FIELDS = "id,name,mimeType,size,modifiedTime,createdTime,parents,webViewLink,iconLink,owners(emailAddress,displayName),trashed"

    export const File = z.looseObject({
        id:           z.string(),
        name:         z.string(),
        mimeType:     z.string(),
        size:         z.string().optional(),
        modifiedTime: z.string().optional(),
        createdTime:  z.string().optional(),
        parents:      z.array(z.string()).optional(),
        webViewLink:  z.string().optional(),
        iconLink:     z.string().optional(),
        trashed:      z.boolean().optional(),
        owners:       z.array(z.looseObject({
            emailAddress: z.string().optional(),
            displayName:  z.string().optional(),
        })).optional(),
    })
    export type File = z.infer<typeof File>

    // Text only, deliberately: no binary content rides through the graph.
    export const TextContent = z.object({
        file:     File,
        mimeType: z.string(),
        text:     z.string(),
    })
    export type TextContent = z.infer<typeof TextContent>

    export const Permission = z.looseObject({
        id:           z.string(),
        type:         z.string(),
        role:         z.string(),
        emailAddress: z.string().optional(),
    })

    export namespace API {

        export namespace Files {
            export namespace List {
                export const Request = z.object({
                    q:         z.string().optional(),
                    pageSize:  z.number().int().min(1).max(1000).default(50),
                    pageToken: z.string().optional(),
                    orderBy:   z.string().default("modifiedTime desc"),
                }).prefault({})
                export const Response = z.object({
                    files:         z.array(File),
                    nextPageToken: z.string().optional(),
                })
            }

            export namespace Get {
                export const Request  = z.object({ fileId: z.string() })
                export const Response = File
            }

            export namespace ReadText {
                export const Request = z.object({
                    fileId:         z.string(),
                    // Only read for Google-native files, which have to be exported.
                    exportMimeType: z.string().optional(),
                })
                export const Response = TextContent
            }

            export namespace CreateFolder {
                export const Request = z.object({
                    name:     z.string(),
                    parentId: z.string().optional(),
                })
                export const Response = File
            }

            export namespace Move {
                export const Request = z.object({
                    fileId:   z.string(),
                    parentId: z.string(),
                })
                export const Response = File
            }

            export namespace Trash {
                export const Request  = z.object({ fileId: z.string() })
                export const Response = File
            }
        }

        export namespace Permissions {
            export namespace Create {
                export const Request = z.object({
                    fileId:                z.string(),
                    role:                  z.enum(["reader", "commenter", "writer"]).default("reader"),
                    type:                  z.enum(["user", "group", "domain", "anyone"]).default("user"),
                    emailAddress:          z.string().optional(),
                    sendNotificationEmail: z.boolean().default(false),
                })
                export const Response = Permission
            }
        }
    }

    // Google-native types cannot be downloaded, only exported to an ordinary format.
    export function defaultExportMime(mimeType: string): string | undefined {
        switch (mimeType) {
            case DOCUMENT_MIME:    return "text/markdown"
            case SPREADSHEET_MIME: return "text/csv"
            case SLIDES_MIME:      return "text/plain"
            default:
                return mimeType.startsWith("application/vnd.google-apps.") ? "application/pdf" : undefined
        }
    }

    export function isTextual(mimeType: string): boolean {
        return mimeType.startsWith("text/")
            || /^application\/(json|xml|javascript|x-yaml|yaml|csv|markdown)/.test(mimeType)
            || mimeType.endsWith("+json")
            || mimeType.endsWith("+xml")
    }

    // Drive's query language quotes with single quotes and escapes with a backslash.
    export function quote(value: string): string {
        return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`
    }
}
