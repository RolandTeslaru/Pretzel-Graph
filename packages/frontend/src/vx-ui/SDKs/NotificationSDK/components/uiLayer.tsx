import { SystemSDK } from '@/SDKs/SystemSDK'
import { Spinner } from '@/vx-ui/foundations'
import { SystemIcons } from '@/vx-ui/icons'
import React, { memo } from 'react'
import { Toaster as Sonner, type ToasterProps } from "sonner"

const UIOverlay = memo((props) => {
    const theme = SystemSDK.useStore(state => state.theme)
    return (
        <Sonner
            theme={theme as ToasterProps["theme"]}
            className="toaster group"
            icons={{
                success: (
                    <SystemIcons.CircleCheck className="size-4" />
                ),
                info: (
                    <SystemIcons.Info className="size-4" />
                ),
                warning: (
                    <SystemIcons.AlertTriangle className="size-4" />
                ),
                error: (
                    <SystemIcons.OctagonX className="size-4" />
                ),
                loading: (
                    <Spinner className="size-4" />
                ),
            }}
            style={
                {
                    "--normal-bg": "var(--popover)",
                    "--normal-text": "var(--popover-foreground)",
                    "--normal-border": "var(--border)",
                    "--border-radius": "var(--radius)",
                } as React.CSSProperties
            }
            toastOptions={{
                classNames: {
                    toast: "cn-toast",
                },
            }}
            {...props}
        />
    )
})

export default UIOverlay
