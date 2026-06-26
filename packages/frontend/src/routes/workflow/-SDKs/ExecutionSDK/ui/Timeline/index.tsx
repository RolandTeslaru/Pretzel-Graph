import { ExecutionSDK } from "../../sdk"
import { SystemIcons } from "@pretzel-graph/standard-ui/icons"
import { TimelineFrameProvider } from "./frame-context"
import TimelineControls from "./Controls"
import TracksPanel from "./TracksPanel"
import TimelineView from "./TimelineView"

const TimelineViewer = () => {
    const recording = ExecutionSDK.useStore(s => s.currentExecution?.recording ?? null)

    if (!recording) {
        return (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground gap-2 animate-pulse">
                <SystemIcons.Film className="text-muted-foreground size-5"/>
                No recording loaded
            </div>
        )
    }

    return (
        <TimelineFrameProvider recording={recording}>
            <TimelineControls/>
            <TracksPanel/>
            <TimelineView/>
        </TimelineFrameProvider>
    )
}

export default TimelineViewer
