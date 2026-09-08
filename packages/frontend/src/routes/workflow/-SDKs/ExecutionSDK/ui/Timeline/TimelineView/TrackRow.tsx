import React from "react"
import UoWBlock from "./UoWBlock"
import { ExecutionSDK } from "../../../sdk"
import { WorkbenchSDK } from "../../../../WorkbenchSDK/sdk"
import type { TimelineTrackLayout } from "../../../selectors"

interface TrackRowProps {
    trackLayout: TimelineTrackLayout
}

const TrackRow = React.memo(({ trackLayout }: TrackRowProps) => {
    const { trackId, top, height, blockHeight } = trackLayout
    // Slice-subscribe to the live track so a new unit on this track re-renders
    // only this row — layout (geometry) stays stable.
    const [track, snapNode] = ExecutionSDK.useStore(s => [
        s.selectors.recording.getTrack(s, trackId),
        s.selectors.recording.getSnapshotedNode(s, trackId),
    ])
    // accent: snapshot node if present, else the live workbench (draft) node —
    // subscribed so a draft recolor reflects even when the execution is quiet.
    // getUI is unguarded on purpose: a deleted track node falls back to the red
    // "node-unknown" accent instead of an undefined (→ transparent) block.
    const accent = WorkbenchSDK.useDocument(d =>
        snapNode?.ui?.accent ?? d.selectors.node.getUI(d, trackId).accent
    )
    if (!track) return null

    return (
        <div
            style={{
                position: "absolute",
                top,
                left: 0,
                right: 0,
                height,
            }}
            className="border-b border-border/50"
        >
            {track.unitIds.map(uowId => (
                <UoWBlock
                    key={uowId}
                    unitId={uowId}
                    accent={accent}
                    height={blockHeight}
                />
            ))}
        </div>
    )
})

TrackRow.displayName = "TrackRow"

export default TrackRow
