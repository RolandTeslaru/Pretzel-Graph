import type { VersionControl } from "@pretzel-graph/shared/domain";

export function getPublicationLabel(publication: VersionControl.Publication.Meta): string {
    return publication.name?.trim() || `Version ${publication.id.slice(0, 8)}`;
}

export function formatTimelineTimestamp(value: Date | string | null | undefined): string {
    if (!value) return "Unknown time";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown time";

    const day = date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
    const time = date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    return `${day} at ${time}`;
}
