import { SystemIcons } from "@pretzel-graph/standard-ui/icons";

export function EmptyFolder() {
    return (
        <div className="absolute top-1/2 left-1/2 -translate-1/2 flex flex-col opacity-70">
            <SystemIcons.FolderOpen size={32} className="mx-auto mb-3" />
            <p className="text-sm">This folder is empty.</p>
        </div>
    )
}
