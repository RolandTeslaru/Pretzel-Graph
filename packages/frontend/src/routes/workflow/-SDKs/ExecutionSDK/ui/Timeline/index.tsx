import { ExecutionSDK } from "../../sdk"
import { DrawerSDK } from "@/routes/workflow/-SDKs/DrawerSDK/sdk"
import { SystemIcons } from "@pretzel-graph/standard-ui/icons"
import TimelineControls from "./Controls"
import TracksPanel from "./TracksPanel"
import TimelineView from "./TimelineView"

const TimelineViewer = () => {
    const hasRecording = ExecutionSDK.useStore(s => !!s.currentExecution?.recording)
    const isDrawerOpen = DrawerSDK.useStore(s => s.isOpen)

    if (!hasRecording) {
        // Only animate while actually visible — the drawer stays mounted at
        // height 0 when closed, and a clipped pulse still costs frames.
        if (!isDrawerOpen)
            return null

        return (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground gap-2 animate-pulse">
                <SystemIcons.Film className="text-muted-foreground size-5"/>
                No recording loaded
            </div>
        )
    }

    return (
        <>
            <TimelineControls/>
            <TracksPanel/>
            <TimelineView/>
        </>
    )
}

export default TimelineViewer
