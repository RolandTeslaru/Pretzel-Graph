import { DialogSDK } from "@/SDKs/DialogSDK";
import type { VersionControl } from "@pretzel-graph/shared/domain";
import { toast } from "sonner";

export function getPublicationLabel(publication: VersionControl.PublicationMeta): string {
    return publication.name?.trim() || `Version ${publication.id.slice(0, 8)}`;
}

export function openDeactivatePublicationDialog(
    publication: VersionControl.PublicationMeta,
    action: () => Promise<unknown>,
) {
    const dialogId = `deactivate-publication-${publication.id}`;

    DialogSDK.actions.push(dialogId, (props) => (
        <DialogSDK.AlertTemplate
            {...props}
            type="warning"
            onApprove={async () => {
                try {
                    await action();
                    toast.success(`${getPublicationLabel(publication)} deactivated`);
                    DialogSDK.actions.pop(dialogId);
                } catch {
                    toast.error("Could not deactivate version");
                }
            }}
            onCancel={() => DialogSDK.actions.pop(dialogId)}
        >
            <div className="font-semibold">
                Deactivate version?
            </div>
            <div className="text-sm text-muted-foreground mt-1">
                <span className="font-semibold text-foreground">{getPublicationLabel(publication)}</span> will be unpublished.
                Its webhook endpoint will stop accepting requests immediately.
            </div>
            <div className="text-sm text-muted-foreground mt-2">
                The version is not deleted — you can reactivate it at any time.
            </div>
        </DialogSDK.AlertTemplate>
    ));
}

export function openDeletePublicationDialog(
    publication: VersionControl.PublicationMeta,
    action: () => Promise<unknown>,
) {
    const dialogId = `delete-publication-${publication.id}`;

    DialogSDK.actions.push(dialogId, (props) => (
        <DialogSDK.AlertTemplate
            {...props}
            type="danger"
            onApprove={async () => {
                try {
                    await action();
                    toast.success(`${getPublicationLabel(publication)} deleted`);
                    DialogSDK.actions.pop(dialogId);
                } catch {
                    toast.error("Could not delete version");
                }
            }}
            onCancel={() => DialogSDK.actions.pop(dialogId)}
        >
            <div className="font-semibold">
                Delete version?
            </div>
            <div className="text-sm text-muted-foreground">
                This removes <span className="font-semibold text-destructive">{getPublicationLabel(publication)}</span> from version history.
            </div>
        </DialogSDK.AlertTemplate>
    ));
}
