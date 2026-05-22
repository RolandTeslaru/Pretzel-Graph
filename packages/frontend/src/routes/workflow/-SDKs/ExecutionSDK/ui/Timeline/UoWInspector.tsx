import React from "react"
import type { Recording } from "@pretzel-graph/shared/domain"
import { ExecutionSDK } from "../../sdk"
import { SystemIcons } from "@pretzel-graph/standard-ui/icons"
import { Button } from "@pretzel-graph/standard-ui/foundations"
import { Separator } from "@pretzel-graph/standard-ui/foundations/separator"

const UoWInspector = () => {
    const recording    = ExecutionSDK.useStore(s => s.currentRecording)
    const selectedUoW  = ExecutionSDK.useStore(s => s.selectedUoW)

    if (!recording || !selectedUoW) return null

    const unit = recording.units[selectedUoW]
    if (!unit) return null

    const node = recording.workflowDataSnapshot.nodes[unit.trackId]
    const inputPorts  = node?.inputs  ?? []
    const outputPorts = node?.outputs ?? []

    const portName = (ports: typeof inputPorts, portId: string) =>
        ports.find(p => p.id === portId)?.displayName ?? portId

    return (
        <div className="w-[260px] shrink-0 border-l border-border flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                <span className="text-xs font-semibold flex-1 truncate">
                    {node?.displayName ?? unit.trackId}
                </span>
                <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => ExecutionSDK.actions.selectUoW(null)}
                >
                    <SystemIcons.X className="size-3" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground uppercase tracking-wide text-[10px]">Status</span>
                    <span className="font-medium">{unit.status}</span>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground uppercase tracking-wide text-[10px]">Duration</span>
                    <span className="font-medium">
                        {unit.duration != null ? `${unit.duration}ms` : "running…"}
                    </span>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground uppercase tracking-wide text-[10px]">Start</span>
                    <span className="font-medium">{unit.startedAt}ms</span>
                </div>

                {Object.keys(unit.inputSnapshot).length > 0 && (
                    <>
                        <Separator />
                        <div className="flex flex-col gap-2">
                            <span className="text-muted-foreground uppercase tracking-wide text-[10px]">Inputs</span>
                            {Object.entries(unit.inputSnapshot).map(([portId, snapshotId]) => {
                                const snap = recording.dataBank.snapshots[snapshotId]
                                return (
                                    <PortValue
                                        key={portId}
                                        label={portName(inputPorts, portId)}
                                        value={snap?.value}
                                    />
                                )
                            })}
                        </div>
                    </>
                )}

                {Object.keys(unit.outputSnapshot).length > 0 && (
                    <>
                        <Separator />
                        <div className="flex flex-col gap-2">
                            <span className="text-muted-foreground uppercase tracking-wide text-[10px]">Outputs</span>
                            {Object.entries(unit.outputSnapshot).map(([portId, snapshotId]) => {
                                const snap = recording.dataBank.snapshots[snapshotId]
                                return (
                                    <PortValue
                                        key={portId}
                                        label={portName(outputPorts, portId)}
                                        value={snap?.value}
                                    />
                                )
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

const PortValue = ({ label, value }: { label: string; value: unknown }) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <pre className="text-[10px] bg-muted/50 rounded p-1.5 overflow-x-auto whitespace-pre-wrap break-all max-h-[120px] overflow-y-auto">
            {value === undefined ? "—" : JSON.stringify(value, null, 2)}
        </pre>
    </div>
)

export default UoWInspector
