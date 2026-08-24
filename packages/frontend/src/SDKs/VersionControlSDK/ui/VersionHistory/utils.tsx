import { DialogSDK } from "@pretzel-graph/standard-ui/SDKs/DialogSDK";
import type { VersionControl } from "@pretzel-graph/shared/domain";
import { toast } from "sonner";
import { LibrarySDK } from "@/SDKs/LibrarySDK/sdk";

const isListing = (publication: VersionControl.Publication.Meta) =>
    Boolean(LibrarySDK.state.workflowMetas[publication.workflow_id]?.listing_id);

const ListingNote = () => (
    <div className="text-sm text-muted-foreground mt-2">
        This workflow is public. With no active version it becomes private; make it public again once a version is active.
    </div>
);

export function getPublicationLabel(publication: VersionControl.Publication.Meta): string {
    return publication.name?.trim() || `Version ${publication.id.slice(0, 8)}`;
}

export function openDeactivatePublicationDialog(
    publication: VersionControl.Publication.Meta,
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
            {isListing(publication) && <ListingNote />}
        </DialogSDK.AlertTemplate>
    ));
}

export function openDeletePublicationDialog(
    publication: VersionControl.Publication.Meta,
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
            {publication.is_active && isListing(publication) && <ListingNote />}
        </DialogSDK.AlertTemplate>
    ));
}
