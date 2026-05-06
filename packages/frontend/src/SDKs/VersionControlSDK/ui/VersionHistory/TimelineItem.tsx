import { useState, type ReactNode } from "react";
import { VersionControlSDK } from "@/SDKs/VersionControlSDK/sdk";
import { openPublishDialog } from "@/SDKs/VersionControlSDK/ui/PublishDialog";
import { Button, DropdownMenu, Spinner } from "@pretzel-graph/standard-ui/foundations";
import { SystemIcons } from "@pretzel-graph/standard-ui/icons";
import type { VersionControl } from "@pretzel-graph/shared/domain";
import { toast } from "sonner";
import { getPublicationLabel, openDeactivatePublicationDialog, openDeletePublicationDialog } from "./utils";

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

    const handleActivate = async () => {
        if (publication.is_active || isPending) return;

        setIsPending(true);
        try {
            await VersionControlSDK.actions.activate(publication.id);
            toast.success(`${getPublicationLabel(publication)} is now active`);
        } catch {
            toast.error("Could not activate version");
        } finally {
            setIsPending(false);
        }
    };

    const handleDeactivate = () => {
        if (!publication.is_active || isPending) return;

        openDeactivatePublicationDialog(publication, async () => {
            setIsPending(true);
            try {
                await VersionControlSDK.actions.deactivate(publication.id);
            } finally {
                setIsPending(false);
            }
        });
    };

    const handleDelete = () => {
        if (isPending) return;

        openDeletePublicationDialog(publication, async () => {
            setIsPending(true);
            try {
                await VersionControlSDK.actions.remove(publication.id);
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
                    disabled={publication.is_active || isPending}
                    onClick={() => void handleActivate()}
                >
                    <SystemIcons.CircleCheck className="size-4" />
                    Make active
                </DropdownMenu.Item>
                {publication.is_active &&
                    <DropdownMenu.Item
                        disabled={!publication.is_active || isPending}
                        onClick={handleDeactivate}
                    >
                        <SystemIcons.Power className="size-4" />
                        Deactivate
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
                <DropdownMenu.Item onClick={openPublishDialog}>
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
