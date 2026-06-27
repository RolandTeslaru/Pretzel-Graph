import { ExecutionSDK } from "../../sdk"
import { SystemIcons } from "@pretzel-graph/standard-ui/icons"
import TimelineControls from "./Controls"
import TracksPanel from "./TracksPanel"
import TimelineView from "./TimelineView"

const TimelineViewer = () => {
    const hasRecording = ExecutionSDK.useStore(s => !!s.currentExecution?.recording)

    if (!hasRecording) {
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
