import * as React from "react"
import type { ComponentProps, FC, Ref } from "react"
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu"
import { cn } from "../utils/cn"
import classNames from "classnames"
import { cva } from "class-variance-authority"
// import { useLocalWindowContext } from "../SDKs/WindowSDK/localContext"

namespace ContextMenuComponents {
  export type Root = FC<ComponentProps<typeof ContextMenuPrimitive.Root>>
  export type Trigger = FC<ComponentProps<typeof ContextMenuPrimitive.Trigger>>
  export type Group = FC<ComponentProps<typeof ContextMenuPrimitive.Group>>
  export type Portal = FC<ComponentProps<typeof ContextMenuPrimitive.Portal>>
  export type Sub = FC<ComponentProps<typeof ContextMenuPrimitive.Sub>>
  export type RadioGroup = FC<ComponentProps<typeof ContextMenuPrimitive.RadioGroup>>
  export type SubContent = FC<ComponentProps<typeof ContextMenuPrimitive.SubContent>>
  export type Content = FC<ComponentProps<typeof ContextMenuPrimitive.Content>>
  export type CheckboxItem = FC<ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>>
  export type RadioItem = FC<ComponentProps<typeof ContextMenuPrimitive.RadioItem>>
  export type Separator = FC<ComponentProps<typeof ContextMenuPrimitive.Separator>>
  export type Shortcut = FC<React.HTMLAttributes<HTMLSpanElement>>

  export type SubTrigger = FC<
    ComponentProps<typeof ContextMenuPrimitive.Trigger> & {
      inset?: boolean
      icon?: React.ReactNode
      ref?: Ref<HTMLDivElement>
    }
  >
  export type Item = FC<
    ComponentProps<typeof ContextMenuPrimitive.Item> & {
      inset?: boolean
      variant?: "default" | "destructive" | "warning"
      preventClose?: boolean
      icon?: React.ReactNode
    }
  >
  export type Label = FC<
    ComponentProps<typeof ContextMenuPrimitive.Label> & {
      inset?: boolean
    }
  >
}




const Root: ContextMenuComponents.Root = (props) => {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />
}

const Trigger: ContextMenuComponents.Trigger = (props) => {
  return <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />
}

const Group: ContextMenuComponents.Group = (props) => {
  return <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />
}

const Portal: ContextMenuComponents.Portal = (props) => {
  return <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />
}

const Sub: ContextMenuComponents.Sub = (props) => {
  return <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...props} />
}

const RadioGroup: ContextMenuComponents.RadioGroup = (props) => {
  return <ContextMenuPrimitive.RadioGroup data-slot="context-menu-radio-group" {...props} />
}

const SubTrigger: ContextMenuComponents.SubTrigger = ({
  className, inset, children, icon, ref, ...rest
}) => (
  <ContextMenuPrimitive.SubTrigger
    className={classNames(
      `text-xs font-roboto-mono antialiased font-semibold relative flex text-label-primary
      data-[highlighted]:bg-blue-600 border border-transparent data-[highlighted]:border-blue-500 gap-2
      rounded-lg cursor-default select-none items-center px-2 py-1.5 outline-hidden focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground`,
      inset && "pl-8",
      className
    )}
    ref={ref}
    {...rest}
  >
    {icon}
    {children}
    <svg
      className="ml-auto h-4 w-4"
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.1584 3.13508C6.35985 2.94621 6.67627 2.95642 6.86514 3.15788L10.6151 7.15788C10.7954 7.3502 10.7954 7.64949 10.6151 7.84182L6.86514 11.8418C6.67627 12.0433 6.35985 12.0535 6.1584 11.8646C5.95694 11.6757 5.94673 11.3593 6.1356 11.1579L9.565 7.49985L6.1356 3.84182C5.94673 3.64036 5.95694 3.32394 6.1584 3.13508Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      ></path>
    </svg>
  </ContextMenuPrimitive.SubTrigger>
)

const SubContent: ContextMenuComponents.SubContent = ({ className, children, ...rest }) => {
  // const { externalContainer } = useLocalWindowContext()

  return (
    // <ContextMenuPrimitive.Portal container={externalContainer}>
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.SubContent
        className={classNames(
          `z-[60] min-w-[8rem] backdrop-blur-xs rounded-xl border border-border-popover bg-popover p-1 text-popover-foreground shadow-lg shadow-black/30
          data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 
          data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 
          data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2`,
          className
        )}
        {...rest}
      >
        {children}
      </ContextMenuPrimitive.SubContent>
    </ContextMenuPrimitive.Portal>
  )
}

const Content: ContextMenuComponents.Content = ({ className, ...rest }) => {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        className={classNames(
          ` z-50 min-w-[8rem] overflow-y-auto overflow-visible backdrop-blur-xs rounded-xl border border-border-popover bg-popover p-1 text-popover-foreground shadow-lg shadow-black/60
          data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 
          data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2`,
          className
        )}
        {...rest}
      />
    </ContextMenuPrimitive.Portal>
  )
}

const contextMenuItemVariants = cva(
  `relative flex data-[highlighted]:shadow-md data-[highlighted]:shadow-black/20 cursor-default rounded-lg select-none items-center px-2 py-1.5 outline-hidden
    text-xs antialiased font-medium font-roboto-mono border border-transparent gap-2
    focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-5 `,
  {
    variants: {
      variant: {
        default:
          "data-[highlighted]:bg-blue-600 data-[highlighted]:border-blue-500 text-label-primary",
        destructive:
          "text-red-600 data-[highlighted]:bg-red-700 data-[highlighted]:border-red-600 data-[highlighted]:text-white ",
        warning:
          "text-yellow-400 data-[highlighted]:bg-yellow-600 data-[highlighted]:border-yellow-500 data-[highlighted]:text-white ",
      },
    },
  }
)

const Item: ContextMenuComponents.Item = ({
  className, children, icon, inset,
  variant = "default",
  preventClose = false,
  ...rest
}) => (
  <ContextMenuPrimitive.Item
    className={cn(
      contextMenuItemVariants({ variant }) +
      `${preventClose && "pointer-events-none!"}`,
      inset && "pl-8",
      className
    )}
    {...rest}
  >
    {icon}
    {children}
  </ContextMenuPrimitive.Item>
)

const CheckboxItem: ContextMenuComponents.CheckboxItem = ({
  className, children, checked, ...rest
}) => (
  <ContextMenuPrimitive.CheckboxItem
    className={cn(
      "relative flex cursor-default select-none items-center rounded-xs py-1.5 pl-8 pr-2 text-sm outline-hidden focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
      className
    )}
    checked={checked}
    {...rest}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <svg
          className="h-4 w-4"
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          ></path>
        </svg>
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.CheckboxItem>
)

const RadioItem: ContextMenuComponents.RadioItem = ({
  className, children, ...rest
}) => (
  <ContextMenuPrimitive.RadioItem
    className={cn(
      "relative flex cursor-default select-none items-center rounded-xs py-1.5 pl-8 pr-2 text-sm outline-hidden focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
      className
    )}
    {...rest}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <svg
          className="h-4 w-4 fill-current"
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9.875 7.5C9.875 8.81168 8.81168 9.875 7.5 9.875C6.18832 9.875 5.125 8.81168 5.125 7.5C5.125 6.18832 6.18832 5.125 7.5 5.125C8.81168 5.125 9.875 6.18832 9.875 7.5Z"
            fill="currentColor"
          ></path>
        </svg>
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.RadioItem>
)

const Label: ContextMenuComponents.Label = ({ className, inset, ...rest }) => (
  <ContextMenuPrimitive.Label
    className={cn(
      "px-2 py-1.5 text-sm font-semibold text-foreground",
      inset && "pl-8",
      className
    )}
    {...rest}
  />
)

const Separator: ContextMenuComponents.Separator = ({ className, ...rest }) => (
  <ContextMenuPrimitive.Separator
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...rest}
  />
)

const Shortcut: ContextMenuComponents.Shortcut = ({ className, ...rest }) => (
  <span
    className={cn(
      "ml-auto text-xs tracking-widest text-muted-foreground",
      className
    )}
    {...rest}
  />
)

export const ContextMenu = {
  Root,
  Trigger,
  Group,
  Portal,
  Sub,
  RadioGroup,
  SubTrigger,
  SubContent,
  Content,
  Item,
  CheckboxItem,
  RadioItem,
  Label,
  Separator,
  Shortcut,
}
