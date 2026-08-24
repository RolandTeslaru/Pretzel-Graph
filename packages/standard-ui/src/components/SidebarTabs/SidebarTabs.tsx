import * as React from "react"
import { ScrollArea, Tabs } from "../../foundations"
import { cn } from "../../utils/cn"

type IconComponent = React.FC<React.SVGProps<SVGSVGElement>>

/**
 * A settings layout: a column of tabs on the left, the active panel on the right.
 * Renders inside a dialog rather than being one, so the caller owns how it opens.
 */
export const SidebarTabs = ({
    header,
    items = [],
    defaultValue,
    empty,
    className,
    sidebarClassName,
    contentClassName,
    sidebarRenderer,
    contentRenderer,
    surfaceStyle,
    blockTransparency,
}: SidebarTabs.Props) => {

    // `surfaceStyle` carries the stack-darkening brightness — applied on each surface rather
    // than a shared ancestor, whose filter would trap both backdrop-blurs. In the background
    // (another dialog on top) they render solid, since there is nothing worth blurring through.

    // Empty rather than the first tab, so the panel can open on an overview.
    const [value, setValue] = React.useState(defaultValue ?? "")

    const active = items.find((item) => item.id === value)

    const context: SidebarTabs.RenderContext = { items, value, active, select: setValue }

    return (
        <Tabs.Root
            orientation="vertical"
            // Focus must not select: the dialog autofocuses the first trigger on open, which
            // under automatic activation would open that tab before the reader chose anything.
            activationMode="manual"
            value={value}
            onValueChange={setValue}
            className={cn(" flex gap-0 flex-row min-h-[600px] w-[700px] shadow-2xl shadow-neutral-500/60 dark:shadow-black/60 !overflow-hidden", className)}
        >
            <div
                style={surfaceStyle}
                className={cn("p-0.5 py-2 w-50 shrink-0 border-y border-l rounded-l-2xl border-border/50", blockTransparency ? "bg-card" : "bg-card/60 backdrop-blur-md", sidebarClassName)}
            >
                {sidebarRenderer ? sidebarRenderer(context) : <>
                    {header && (
                        <div className="inline-flex items-center px-1">
                            <header.icon className="size-4 m-2" />
                            <p className="font-semibold w-35 text-sm text-ellipsis text-nowrap overflow-hidden">
                                {header.title}
                            </p>
                        </div>
                    )}

                    <Tabs.List variant="sidebar" className="py-2 pt-4 px-1 gap-1">
                        {items.map((item) => (
                            <Tabs.Trigger
                                key={item.id}
                                value={item.id}
                                className={cn(item.tone === "destructive" && "text-destructive data-[state=active]:bg-destructive/10")}
                            >
                                <item.icon className="size-4" />
                                {item.label}
                            </Tabs.Trigger>
                        ))}
                    </Tabs.List>
                </>}
            </div>

            <ScrollArea.Root
                style={surfaceStyle}
                className={cn("flex-1 max-h-[600px] border border-border rounded-r-2xl px-4", blockTransparency ? "bg-card" : "bg-card/80 backdrop-blur-md", contentClassName)}
            >
                {contentRenderer ? contentRenderer(context) : <>
                    <div className="inline-flex z-100 items-center absolute w-full top-0 left-4 gap-2 h-9 mt-2 shrink-0">
                        <p className="text-md font-semibold">{active?.label}</p>
                    </div>

                    {items.map((item) => (
                        <Tabs.Content key={item.id} value={item.id}>
                            {/* Clears the header floating above the scroll area. */}
                            <div className="h-12" />
                            {item.panel}
                        </Tabs.Content>
                    ))}

                    {!active && empty && (
                        <div className="absolute top-1/2 -translate-1/2 left-1/2 w-[300px] flex flex-col gap-2 p-6 h-full justify-center items-center text-center">
                            {empty.icon}
                            <p className="text-sm font-medium">{empty.title}</p>
                            <p className="text-xs text-muted-foreground max-w-55">{empty.description}</p>
                        </div>
                    )}
                </>}
            </ScrollArea.Root>
        </Tabs.Root>
    )
}

export namespace SidebarTabs {

    export type Item = {
        id:    string
        label: string
        icon:  IconComponent
        /** `destructive` colours the row, for a tab that ends things. */
        tone?: "default" | "destructive"
        panel: React.ReactNode
    }

    /** Shown until a tab is picked. Omit it to open on an empty panel. */
    export type Empty = {
        icon?:       React.ReactNode
        title:       string
        description: string
    }

    /** Handed to a renderer, so a replacement can still drive the tabs. */
    export type RenderContext = {
        items:  Item[]
        /** The active tab's id, or "" when none is picked. */
        value:  string
        active?: Item
        select: (id: string) => void
    }

    export type Props = {
        /** Omitted when a `sidebarRenderer` draws its own. */
        header?:       { icon: IconComponent; title: string }
        /** Omitted when both halves are rendered by the caller. */
        items?:        Item[]
        defaultValue?: string
        empty?:        Empty
        className?:    string
        sidebarClassName?: string
        contentClassName?: string
        /** Replaces what the sidebar holds. The surface it sits on stays. */
        sidebarRenderer?: (context: RenderContext) => React.ReactNode
        /** Replaces what the panel holds — header, panels and empty state alike. The scrolling surface stays. */
        contentRenderer?: (context: RenderContext) => React.ReactNode
        /** From DialogSDK.UnstyledTemplate — the stack-darkening filter for this depth. */
        surfaceStyle?: React.CSSProperties
        /** True when another dialog covers this one: render solid rather than frosted. */
        blockTransparency?: boolean
    }
}
