import { DialogSDK } from "@pretzel-graph/standard-ui/SDKs/DialogSDK";
import type { VersionControl } from "@pretzel-graph/shared/domain";
import { toast } from "sonner";
import { LibrarySDK } from "@/SDKs/LibrarySDK/sdk";
import { getPublicationLabel } from "../utils";

const isListing = (publication: VersionControl.Publication.Meta) =>
    Boolean(LibrarySDK.state.workflowMetas[publication.workflow_id]?.listing_id);

const ListingNote = () => (
    <div className="text-sm text-muted-foreground mt-2">
        This workflow is public. With no deployed version it becomes private; make it public again once a version is deployed.
    </div>
);

export function openDeployDialog(
    publication: VersionControl.Publication.Meta,
    replaced: VersionControl.Publication.Meta | null,
    action: () => Promise<unknown>,
) {
    const dialogId = `deploy-publication-${publication.id}`;

    DialogSDK.actions.push(dialogId, (props) => (
        <DialogSDK.AlertTemplate
            {...props}
            type="warning"
            onApprove={async () => {
                try {
                    await action();
                    toast.success(`${getPublicationLabel(publication)} deployed`);
                    DialogSDK.actions.pop(dialogId);
                } catch {
                    toast.error("Could not deploy version");
                }
            }}
            onCancel={() => DialogSDK.actions.pop(dialogId)}
        >
            <div className="font-semibold">
                Deploy version?
            </div>
            <div className="text-sm text-muted-foreground mt-1">
                <span className="font-semibold text-foreground">{getPublicationLabel(publication)}</span> goes live immediately.
                Its webhooks start accepting requests and its connection listeners start reacting to events.
            </div>
            {replaced &&
                <div className="text-sm text-muted-foreground mt-2">
                    It replaces <span className="font-semibold text-foreground">{getPublicationLabel(replaced)}</span>, which stops receiving events.
                </div>
            }
            {isListing(publication) &&
                <div className="text-sm text-muted-foreground mt-2">
                    This workflow is public. Its listing will serve this version.
                </div>
            }
        </DialogSDK.AlertTemplate>
    ));
}

export function openUndeployDialog(
    publication: VersionControl.Publication.Meta,
    action: () => Promise<unknown>,
) {
    const dialogId = `undeploy-publication-${publication.id}`;

    DialogSDK.actions.push(dialogId, (props) => (
        <DialogSDK.AlertTemplate
            {...props}
            type="warning"
            onApprove={async () => {
                try {
                    await action();
                    toast.success(`${getPublicationLabel(publication)} undeployed`);
                    DialogSDK.actions.pop(dialogId);
                } catch {
                    toast.error("Could not undeploy version");
                }
            }}
            onCancel={() => DialogSDK.actions.pop(dialogId)}
        >
            <div className="font-semibold">
                Undeploy version?
            </div>
            <div className="text-sm text-muted-foreground mt-1">
                <span className="font-semibold text-foreground">{getPublicationLabel(publication)}</span> will be undeployed.
                Its webhooks and connection listeners stop immediately.
            </div>
            <div className="text-sm text-muted-foreground mt-2">
                The version is not deleted — you can deploy it again at any time.
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
                This removes <span className="font-semibold text-destructive">{getPublicationLabel(publication)}</span> from publication history.
            </div>
            {publication.is_deployed && isListing(publication) && <ListingNote />}
        </DialogSDK.AlertTemplate>
    ));
}
