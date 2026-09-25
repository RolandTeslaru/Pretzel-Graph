import { useState, type ReactNode } from "react";
import { VersionControlSDK } from "@/SDKs/VersionControlSDK/sdk";
import { Button, DropdownMenu, Spinner } from "@pretzel-graph/standard-ui/foundations";
import { SystemIcons } from "@pretzel-graph/standard-ui/icons";
import type { VersionControl } from "@pretzel-graph/shared/domain";

type TimelineItemProps = {
    actionType?: "draft" | "publication";
    badge?: ReactNode;
    highlighted?: boolean;
    label: string;
    marker: ReactNode;
    publication?: VersionControl.Publication.Meta;
    showLine?: boolean;
    subtitle: string;
};

function PublicationActions({
    publication,
}: {
    publication: VersionControl.Publication.Meta;
}) {
    const [isPending, setIsPending] = useState(false);

    const handleDeploy = () => {
        if (publication.is_deployed || isPending) return;

        const replaced = VersionControlSDK.state.selectors.getDeployed(VersionControlSDK.state, publication.workflow_id);

        VersionControlSDK.dialogs.openDeploy(publication, replaced, async () => {
            setIsPending(true);
            try {
                await VersionControlSDK.actions.deployPublication(publication.workflow_id, publication.id);
            } finally {
                setIsPending(false);
            }
        });
    };

    const handleUndeploy = () => {
        if (!publication.is_deployed || isPending) return;

        VersionControlSDK.dialogs.openUndeploy(publication, async () => {
            setIsPending(true);
            try {
                await VersionControlSDK.actions.undeploy(publication.workflow_id);
            } finally {
                setIsPending(false);
            }
        });
    };

    const handleDelete = () => {
        if (isPending) return;

        VersionControlSDK.dialogs.openDeletePublication(publication, async () => {
            setIsPending(true);
            try {
                await VersionControlSDK.actions.remove(publication.workflow_id, publication.id);
            } finally {
                setIsPending(false);
            }
        });
    };

    return (
        <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger asChild>
                <Button
                    variant="ghost"
                    size="icon-xs"
                    className="mt-[-2px] rounded-full"
                    disabled={isPending}
                >
                    {isPending ? <Spinner className="size-3.5" /> : <SystemIcons.Ellipsis className="size-4" />}
                </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
                <DropdownMenu.Item
                    disabled={publication.is_deployed || isPending}
                    onClick={handleDeploy}
                >
                    <SystemIcons.CircleCheck className="size-4" />
                    Deploy this version
                </DropdownMenu.Item>
                {publication.is_deployed &&
                    <DropdownMenu.Item
                        disabled={!publication.is_deployed || isPending}
                        onClick={handleUndeploy}
                    >
                        <SystemIcons.Power className="size-4" />
                        Undeploy
                    </DropdownMenu.Item>
                }
                <DropdownMenu.Separator />
                <DropdownMenu.Item
                    variant="destructive"
                    disabled={isPending}
                    onClick={handleDelete}
                >
                    <SystemIcons.Trash2 className="size-4" />
                    Delete version
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
}

function DraftActions() {
    return (
        <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger asChild>
                <Button
                    variant="ghost"
                    size="icon-xs"
                    className="mt-[-2px] rounded-full"
                >
                    <SystemIcons.Ellipsis className="size-4" />
                </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
                <DropdownMenu.Item onClick={VersionControlSDK.dialogs.openPublish}>
                    <SystemIcons.CloudUpload className="size-4" />
                    Publish current changes
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
}

export function TimelineItem({
    actionType,
    badge,
    highlighted = false,
    label,
    marker,
    publication,
    showLine = true,
    subtitle,
}: TimelineItemProps) {
    return (
        <div className="relative pl-7">
            <div className={`rounded-md border p-1 pl-3 transition-colors ${highlighted ? "bg-muted/40 border-border/90 shadow-sm" : "bg-muted/60 border-transparent hover:bg-muted/35"}`}>
                <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-medium text-foreground">
                                {label}
                            </div>
                            {badge}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                            {subtitle}
                        </div>
                    </div>
                    {actionType === "draft" && <DraftActions />}
                    {actionType === "publication" && publication && <PublicationActions publication={publication} />}
                </div>
            </div>
        </div>
    );
}
