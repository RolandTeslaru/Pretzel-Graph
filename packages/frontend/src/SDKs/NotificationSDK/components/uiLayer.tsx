import { SystemSDK } from '@/SDKs/SystemSDK'
import { Spinner } from '@vx-agent-editor/vx-ui/foundations'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
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

                    "--success-bg": "var(--success-background)",
                    "--success-text": "var(--success-foreground)",
                    "--success-border": "color-mix(in srgb, var(--success-foreground) 30%, var(--success-background))",

                    "--warning-bg": "var(--warning-background)",
                    "--warning-text": "var(--warning-foreground)",
                    "--warning-border": "color-mix(in srgb, var(--warning-foreground) 30%, var(--warning-background))",

                    "--error-bg": "var(--error-background)",
                    "--error-text": "var(--error-foreground)",
                    "--error-border": "color-mix(in srgb, var(--error-foreground) 30%, var(--error-background))",

                    "--info-bg": "var(--info-background)",
                    "--info-text": "var(--info-foreground)",
                    "--info-border": "color-mix(in srgb, var(--info-foreground) 30%, var(--info-background))",

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
