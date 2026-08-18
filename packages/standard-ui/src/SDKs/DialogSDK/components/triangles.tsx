import React from "react"
import VexrLogo from "./VexrLogo"
import { SystemIcons } from "../../../icons"

const DangerTriangle = () => (
    <div className="px-2 pt-2 relative">
        <VexrLogo
            className="h-[80px] text-red-600 rotate-180 animate-pulse"
            svgClassName={`
                    [filter:drop-shadow(0_0_5px_rgba(220,38,38,0.7))_drop-shadow(0_0_12px_rgba(220,38,38,0.5))]`}
        />
    </div>
)

const WarningTriangle = () => (
    <div className="p-5 relative">
        <SystemIcons.AlertTriangle size={60} className="!text-yellow-400" />
        <SystemIcons.AlertTriangle size={60} className="animate-ping absolute top-5 !text-yellow-400" />
    </div>
)

export const TRIANGLE_RENDER_MAP = {
    "danger": () => <DangerTriangle />,
    "warning": () => <WarningTriangle />,
    "accent": () => null,
    default: null
}