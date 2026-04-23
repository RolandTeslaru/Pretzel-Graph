import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import type { ComponentProps, FC } from "react"

import { type ButtonProps, buttonVariants } from "./button"
import { cn } from "../utils/cn"

namespace AlertDialogComponents {
  export type Root = FC<ComponentProps<typeof AlertDialogPrimitive.Root>>
  export type Trigger = FC<ComponentProps<typeof AlertDialogPrimitive.Trigger>>
  export type Portal = FC<ComponentProps<typeof AlertDialogPrimitive.Portal>>
  export type Overlay = FC<ComponentProps<typeof AlertDialogPrimitive.Overlay>>
  export type Content = FC<ComponentProps<typeof AlertDialogPrimitive.Content> & {
    darkenBackground?: boolean
    blockTransparency?: boolean
    showTriangle?: boolean
    theme?: "dark" | "light"
  }>
  export type Header = FC<React.HTMLAttributes<HTMLDivElement>>
  export type Footer = FC<React.HTMLAttributes<HTMLDivElement>>
  export type Title = FC<ComponentProps<typeof AlertDialogPrimitive.Title>>
  export type Description = FC<ComponentProps<typeof AlertDialogPrimitive.Description>>
  export type Action      = FC<ComponentProps<typeof AlertDialogPrimitive.Action> & ButtonProps>
  export type Cancel      = FC<ComponentProps<typeof AlertDialogPrimitive.Cancel> & ButtonProps>
}



const Root: AlertDialogComponents.Root = (props) => <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />

const Trigger: AlertDialogComponents.Trigger = (props) => <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />

const Portal: AlertDialogComponents.Portal = (props) => <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />

const Overlay: AlertDialogComponents.Overlay = ({ className, ...props }) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/30 dark:bg-black/70  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
)

const Content: AlertDialogComponents.Content = ({
  darkenBackground = true,
  blockTransparency = false,
  theme,
  style,
  className,
  children,
  ...rest
}) => (
  <Portal>
    {darkenBackground && <Overlay />}
    <AlertDialogPrimitive.Content
      data-slot="alert-dialog-content"
      className={cn(
        `${theme || ""} fixed left-[50%] top-[50%] z-50 rounded-2xl
         border border-border outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0
         transition-[opacity,transform] duration-400 ease-in-out
         data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-70 
         data-[state=open]:zoom-in-70 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 
         data-[state=open]:slide-in-from-top-[48%]
         shadow-2xl shadow-neutral-500/60 dark:shadow-black/60
         `,
        blockTransparency ? 'bg-card' : ' bg-card/80 dark:bg-card/70 backdrop-blur-sm',
        className
      )}
      style={{
        // boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.5)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </AlertDialogPrimitive.Content>
  </Portal>
)

const Header: AlertDialogComponents.Header = ({ className, ...rest }) => (
  <div
    className={cn("flex flex-col space-y-2 text-center sm:text-left ", className)}
    {...rest}
  />
)

const Footer: AlertDialogComponents.Footer = ({ className, ...rest }) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-4", className)}
    {...rest}
  />
)

const Title: AlertDialogComponents.Title = ({ className, ...rest }) => (
  <AlertDialogPrimitive.Title
    className={cn("text-lg  text-foreground antialiased font-semibold font-roboto-mono", className)}
    {...rest}
  />
)

const Description: AlertDialogComponents.Description = ({ className, ...rest }) => (
  <AlertDialogPrimitive.Description
    className={cn("text-sm text-muted-foreground max-w-[500px] font-inter", className)}
    {...rest}
  />
)

const Action: AlertDialogComponents.Action = ({
  className, children, variant,
  size = "default",
  ...rest
}) => (
  <AlertDialogPrimitive.Action
    className={cn(buttonVariants({ variant: variant as any, size: size as any }), className)}
    {...rest}
  >
    {children}
  </AlertDialogPrimitive.Action>
)

const Cancel: AlertDialogComponents.Cancel = ({
  className, children,
  variant = "outline",
  size = "default",
  ...rest
}) => (
  <AlertDialogPrimitive.Cancel
    className={cn(buttonVariants({ variant: variant as any, size: size as any }), className)}
    {...rest}
  >
    {children}
  </AlertDialogPrimitive.Cancel>
)

export const AlertDialog = {
  Root,
  Trigger,
  Portal,
  Overlay,
  Content,
  Header,
  Footer,
  Title,
  Description,
  Action,
  Cancel,
}
