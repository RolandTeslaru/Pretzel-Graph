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
            position="top-center"
            richColors
            icons={{
                success: (
                    <SystemIcons.Check className="size-5" />
                ),
                info: (
                    <SystemIcons.Info className="size-5" />
                ),
                warning: (
                    <SystemIcons.AlertTriangle className="size-5" />
                ),
                error: (
                    <SystemIcons.OctagonX className="size-5" />
                ),
                loading: (
                    <Spinner className="size-5" />
                ),
            }}
            style={
                {
                    "--normal-bg": "var(--popover)",
                    "--normal-text": "var(--popover-foreground)",
                    "--normal-border": "var(--border)",
                    "--border-radius": "var(--radius-xl)",

                    "--success-bg": "var(--color-green-950)",
                    "--success-border": "color-mix(in srgb, var(--color-green-500) 10%, transparent)",

                    // Warning
                    "--warning-bg": "var(--color-yellow-950)",
                    "--warning-border": "color-mix(in srgb, var(--color-yellow-500) 10%, transparent)",
                    "--toast-icon-margin-end": "10px",
                } as React.CSSProperties
            }
            toastOptions={{
                classNames: {
                    toast: "cn-toast",
                },
                style: {
                    boxShadow: "0px 5px 20px 1px rgba(0, 0, 0, 0.3)"
                }
            }}
            {...props}
        />
    )
})

export default UIOverlay
