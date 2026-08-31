import { RuntimeNode, defineLoaders, type InferOutputs } from "@pretzel-graph/node-sdk";

import { GoogleDriveClient, bareHTTP } from "../client";
import { Google } from "../domain";
import { googleToken, loaderValue, optional } from "../shared";
import { Blueprint } from "./blueprint";
import { buildTools } from "./tools";


export class Node extends RuntimeNode<typeof Blueprint> {

    static loaders = defineLoaders<typeof Blueprint>()({

        async folders({ credentials, credentialsAPI, searchQuery, paginationCursor }) {
            const drive = new GoogleDriveClient(bareHTTP(), googleToken(credentialsAPI, credentials.googleDriveOAuth, "Google Drive"));

            const q = [
                `mimeType = '${Google.Drive.FOLDER_MIME}'`,
                "trashed = false",
                ...(searchQuery ? [`name contains ${Google.Drive.quote(searchQuery)}`] : []),
            ].join(" and ");

            const { files, nextPageToken } = await drive.files.list({ q, pageSize: 30, pageToken: paginationCursor, orderBy: "name" });

            return {
                options: files.map(f => ({ label: f.name, value: f.id, url: f.webViewLink })),
                nextPaginationCursor: nextPageToken,
            };
        },
    });


    protected override async onRun(): Promise<Partial<InferOutputs<typeof Blueprint>>> {
        const fields = this.fieldValues;
        const drive  = this.drive;

        if (fields.isConvertedToTool === true)
            return {
                tools: buildTools(drive),
            } satisfies InferOutputs<typeof Blueprint, typeof fields>;

        switch (fields.resource) {

            case "search": {
                const folder   = loaderValue(fields.folder);
                const name     = optional(fields.nameContains);
                const mimeType = optional(fields.mimeType);

                const q = [
                    ...(fields.includeTrashed ? [] : ["trashed = false"]),
                    ...(name     ? [`name contains ${Google.Drive.quote(name)}`] : []),
                    ...(folder   ? [`${Google.Drive.quote(folder)} in parents`]   : []),
                    ...(mimeType ? [`mimeType = ${Google.Drive.quote(mimeType)}`] : []),
                ].join(" and ");

                const { files } = await drive.files.list({ q: q || undefined, pageSize: fields.limit });

                return { files } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            case "get":
                return {
                    file: await drive.files.get({ fileId: fields.fileId }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "readText":
                return {
                    content: await drive.files.readText({
                        fileId:         fields.readFileId,
                        exportMimeType: optional(fields.exportMimeType),
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "createFolder":
                return {
                    folder: await drive.files.createFolder({
                        name:     fields.folderName,
                        parentId: loaderValue(fields.parentFolder),
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "move": {
                const parentId = loaderValue(fields.destinationFolder);

                if (!parentId)
                    throw new Error("Google Drive: pick a destination folder.");

                return {
                    file: await drive.files.move({ fileId: fields.moveFileId, parentId }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
            }

            case "share":
                return {
                    permission: await drive.permissions.create({
                        fileId:                fields.shareFileId,
                        type:                  fields.shareType,
                        role:                  fields.shareRole,
                        emailAddress:          fields.shareType === "anyone" ? undefined : optional(fields.shareWith),
                        sendNotificationEmail: fields.notify,
                    }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;

            case "trash":
                return {
                    file: await drive.files.trash({ fileId: fields.trashFileId }),
                } satisfies InferOutputs<typeof Blueprint, typeof fields>;
        }

        return {};
    }


    #drive: GoogleDriveClient | undefined;

    private get drive(): GoogleDriveClient {
        this.#drive ??= new GoogleDriveClient(
            this.httpClientFactory,
            googleToken(this.context.credentialsAPI, this.credentials.googleDriveOAuth, "Google Drive"),
        );

        return this.#drive;
    }
}
