"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { type ComponentProps, useCallback, useEffect, useRef } from "react"

import { cn } from "../utils/cn"
import { cva } from "class-variance-authority"


const listVars = cva(
  "rounded-lg inline-flex h-auto items-center justify-center border text-muted-foreground relative",
  {
    variants: {
      variant: {
        opaque: "dark:bg-input/30  border-input text-foreground"
      },
      size: {
        sm: "p-0.5 gap-0.5",
        default: "p-1 gap-1",
        lg: "p-1.5 gap-1.5"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
)

const indicatorVars = cva(
  "rounded-lg absolute top-[1px] z-[0] !pointer-events-none border transition-all duration-300 ease-out",
  {
    variants: {
      variant: {
        primary: "bg-primary/80 border-primary-accent shadow-primary-accent",
        accent: "bg-accent"
      }
    }
  }
)

function Root({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}


const triggerVars = cva(
  `inline-flex items-center z-10 justify-center whitespace-nowrap rounded-md
   font-semibold !text-label-primary ring-offset-background transition-all 
   border border-transparent cursor-pointer
   focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 
   disabled:pointer-events-none disabled:opacity-50`,
  {
    variants: {
      size: {
        sm: "px-2 py-1 text-xs",
        default: "px-3 py-1.5 text-sm",
        lg: "px-4 py-2 text-base"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
)

type TabsSize = "sm" | "default" | "lg"
const TabsSizeContext = React.createContext<TabsSize>("default")

const List = ({
  className,
  children,
  indicatorVariant = "accent",
  variant = "opaque",
  size = "default",
  ...props
}: ComponentProps<typeof TabsPrimitive.List> & {
  indicatorVariant?: "accent" | "primary"
  variant?: "opaque"
  size?: TabsSize
}) => {
  const indicatorRef = useRef<null | HTMLDivElement>(null);
  const listRef = useRef<null | HTMLDivElement>(null)

  const updateIndicatorToActiveTab = useCallback(() => {
    if (!indicatorRef.current || !listRef.current) return;

    const activeTab = listRef.current.querySelector('[data-state="active"]') as HTMLElement;
    if (!activeTab) return;

    indicatorRef.current.style.width = `${activeTab.clientWidth}px`
    indicatorRef.current.style.height = `${activeTab.clientHeight}px`
    indicatorRef.current.style.left = `${activeTab.offsetLeft}px`
  }, [])

  // Update indicator on mount and when tabs change
  useEffect(() => {
    updateIndicatorToActiveTab()

    // Use MutationObserver to detect when data-state changes on triggers
    if (!listRef.current) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'data-state') {
          updateIndicatorToActiveTab()
          break
        }
      }
    })

    // Observe all trigger children for attribute changes
    const triggers = listRef.current.querySelectorAll('[data-slot="tabs-trigger"]')
    triggers.forEach(trigger => {
      observer.observe(trigger, { attributes: true, attributeFilter: ['data-state'] })
    })

    return () => observer.disconnect()
  }, [updateIndicatorToActiveTab]);

  return (
    <TabsSizeContext.Provider value={size}>
      <TabsPrimitive.List
        ref={listRef}
        data-slot="tabs-list"
        className={cn(listVars({ variant, size }), className)}
        {...props}
      >
        {children}
        {/* Animated indicator */}
        <div
          ref={indicatorRef}
          className={cn(indicatorVars({ variant: indicatorVariant }))}
        />
      </TabsPrimitive.List>
    </TabsSizeContext.Provider>
  )
}
List.displayName = TabsPrimitive.List.displayName

function Trigger({
  className,
  size,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & {
  size?: TabsSize
}) {
  const contextSize = React.useContext(TabsSizeContext)
  const resolvedSize = size ?? contextSize

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(triggerVars({ size: resolvedSize }), className)}
      {...props}
    />
  )
}

function Content({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "data-[state=inactive]:hidden",
        className
      )}
      {...props}
    />
  )
}


export const Tabs = {
  Root, List, Trigger, Content
}




