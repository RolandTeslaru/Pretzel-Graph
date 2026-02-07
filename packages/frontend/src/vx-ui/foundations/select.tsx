"use client"

import * as SelectPrimitive from "@radix-ui/react-select"

import { cn } from "../utils/cn"
import type { ComponentProps, FC } from "react"
import { SystemIcons } from "../icons"

namespace SelectComponents {
  export type Root = FC<ComponentProps<typeof SelectPrimitive.Root>>
  export type Group = FC<ComponentProps<typeof SelectPrimitive.Group>>
  export type Value = FC<ComponentProps<typeof SelectPrimitive.Value>>
  export type Trigger = FC<ComponentProps<typeof SelectPrimitive.Trigger> & { size?: "sm" | "xs" }>
  export type ScrollUpButton = FC<ComponentProps<typeof SelectPrimitive.ScrollUpButton>>
  export type ScrollDownButton = FC<ComponentProps<typeof SelectPrimitive.ScrollDownButton>>
  export type Content = FC<ComponentProps<typeof SelectPrimitive.Content> & { position?: "popper" | "item-aligned" }>
  export type Label = FC<ComponentProps<typeof SelectPrimitive.Label>>
  export type Item = FC<ComponentProps<typeof SelectPrimitive.Item>>
  export type Separator = FC<ComponentProps<typeof SelectPrimitive.Separator>>
}

const Root: SelectComponents.Root = (props) => <SelectPrimitive.Root data-slot="select" {...props} />

const Group: SelectComponents.Group = (props) => <SelectPrimitive.Group data-slot="select-group" {...props} />


const Value: SelectComponents.Value = (props) => (
  <SelectPrimitive.Value
    className="text-label-primary"
    data-slot="select-value"
    {...props}
  />
)

const Trigger: SelectComponents.Trigger = ({ className, children, size = "sm", ...props }) => {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        `border-input/70 cursor-pointer 
        data-[placeholder]:text-muted-foreground 
        [&_svg:not([class*='text-'])]:text-muted-foreground 
        focus-visible:border-ring 
        focus-visible:ring-ring/50 
        aria-invalid:ring-destructive/20 
        dark:aria-invalid:ring-destructive/40 
        aria-invalid:border-destructive 
        bg-input/30 hover:bg-input/50 
        flex w-full items-center 
        justify-between gap-2 
        rounded-lg border 
        pr-2 pl-2.5 py-2 text-sm whitespace-nowrap shadow-xs 
        transition-[color,box-shadow] 
        outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed 
        disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`,
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <SystemIcons.ChevronDown className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

const ScrollUpButton: SelectComponents.ScrollUpButton = ({ className, ...rest }) => (
  <SelectPrimitive.ScrollUpButton
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...rest}
  >
    <SystemIcons.ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
)

const ScrollDownButton: SelectComponents.ScrollDownButton = ({ className, ...rest }) => (
  <SelectPrimitive.ScrollDownButton
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...rest}
  >
    <SystemIcons.ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
)

const Content: SelectComponents.Content = ({
  className,
  children,
  position = "popper",
  ...rest
}) => {

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          `bg-popover/80 backdrop-blur-lg text-popover-foreground min-w-[8rem] 
           overflow-x-hidden overflow-y-auto rounded-lg border border-input/80 shadow-md
          
          data-[state=open]:animate-in 
          data-[state=closed]:animate-out 
          data-[state=closed]:fade-out-0 
          data-[state=open]:fade-in-0 
          data-[state=closed]:zoom-out-95 
          data-[state=open]:zoom-in-95 
          data-[side=bottom]:slide-in-from-top-2 
          data-[side=left]:slide-in-from-right-2 
          data-[side=right]:slide-in-from-left-2 
          data-[side=top]:slide-in-from-bottom-2 
          
          relative z-50 
          
          max-h-(--radix-select-content-available-height) 
 
          origin-(--radix-select-content-transform-origin) 
          `,
          position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...rest}
      >
        <ScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <ScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

const Label: SelectComponents.Label = ({ className, ...props }) => <SelectPrimitive.Label className={cn("py-1.5 pl-8 pr-2 text-xs font-semibold", className)} {...props} />

const Item: SelectComponents.Item = ({ className, children, ...props }) => (
  <SelectPrimitive.Item
    className={cn(
      `focus:bg-primary/80 focus:text-accent-foreground 
       border border-transparent focus:border-primary-accent/60

       relative flex w-full cursor-default items-center gap-2 
       rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none 
       data-[disabled]:pointer-events-none 
       data-[disabled]:opacity-50 
       
       [&_svg:not([class*='text-'])]:text-muted-foreground 
       [&_svg]:pointer-events-none 
       [&_svg]:shrink-0 
       [&_svg:not([class*='size-'])]:size-4 
       *:[span]:last:flex 
       *:[span]:last:items-center 
       *:[span]:last:gap-2
       `,
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center text-label-primary">
      <SelectPrimitive.ItemIndicator>
        <SystemIcons.Check className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>
      <span>{children}</span>
    </SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
)

const Separator: SelectComponents.Separator = ({ className, ...props }) => <SelectPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-neutral-400/20", className)} {...props} />

export const Select = {
  Root,
  Group,
  Value,
  Trigger,
  ScrollUpButton,
  ScrollDownButton,
  Content,
  Label,
  Item,
  Separator,
}
