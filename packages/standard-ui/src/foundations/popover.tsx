import type { FC, ReactNode, ComponentProps } from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "../utils/cn"
import { cva } from "class-variance-authority"
// import { useLocalWindowContext } from "../SDKs/WindowSDK/localContext"

namespace PopoverComponents {
  export type Root = FC<ComponentProps<typeof PopoverPrimitive.Root>>
  export type Trigger = FC<ComponentProps<typeof PopoverPrimitive.Trigger> & {
    disableStyling?: boolean
    className?: string
    icon?: ReactNode
  }>
  export type Anchor = FC<ComponentProps<typeof PopoverPrimitive.Anchor>>
  export type Content = FC<ComponentProps<typeof PopoverPrimitive.Content>>
  export type Item = FC<
    React.HTMLAttributes<HTMLDivElement> & {
      children?: ReactNode
      icon?: ReactNode
      variant?: "default" | "destructive"
    }
  >
}

const Root: PopoverComponents.Root = (props) => {
  return <PopoverPrimitive.Root {...props} />
}

const Anchor: PopoverComponents.Anchor = (props) => {
  return <PopoverPrimitive.Anchor {...props} />
}

const Trigger: PopoverComponents.Trigger = ({
  ref, children, icon, disableStyling, ...rest
}) => {
  return (
    <PopoverPrimitive.Trigger
      ref={ref}
      {...rest}
    >
      {children}
    </PopoverPrimitive.Trigger>
  )
}

const Content: PopoverComponents.Content = ({
  ref, className, children,
  sideOffset = 1,
  align = "center",
  side = "bottom",
  ...rest
}) => {
  // const { externalContainer } = useLocalWindowContext()
  return (
    // <PopoverPrimitive.Portal container={externalContainer}>
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        side={side}
        sideOffset={sideOffset}
        className={cn(
          `z-50 outline-none backdrop-blur-lg bg-popover/80 border border-border-popover rounded-lg p-1 shadow-black/15  dark:shadow-black/50 shadow-xl
             data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 
             data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 
             data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2`,
          className
        )}
        {...rest}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}
Content.displayName = PopoverPrimitive.Content.displayName

const popoverItemVariants = cva(
  "cursor-pointer font-roboto-mono relative gap-2 px-2 py-[6px] rounded-lg flex text-xs border border-transparent ",
  {
    variants: {
      variant: {
        default: "hover:bg-accent hover:border-accent-secondary text-label-primary",
        destructive: "hover:bg-red-700 hover:text-white hover:border-red-600",
      },
    },
  }
)

const Item: PopoverComponents.Item = ({
  children, className, icon,
  variant = "default",
  ...rest
}) => {
  return (
    <div
      className={popoverItemVariants({ variant }) + " " + className}
      {...rest}
    >
      <div className="absolute top-1/2 -translate-y-1/2 ">{icon}</div>
      <div className={`${icon && "pl-7"} text-sm`}>{children}</div>
    </div>
  )
}

export const Popover = { Root, Trigger, Item, Content, Anchor }