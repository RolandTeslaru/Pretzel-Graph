"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import type { ComponentProps, FC } from "react"
import { cn } from "../utils/cn"
import classNames from "classnames"

namespace DialogComponents {
  export type Root = FC<ComponentProps<typeof DialogPrimitive.Root>>
  export type Trigger = FC<ComponentProps<typeof DialogPrimitive.Trigger>>
  export type Portal = FC<ComponentProps<typeof DialogPrimitive.Portal>>
  export type Close = FC<ComponentProps<typeof DialogPrimitive.Close>>
  export type Overlay = FC<ComponentProps<typeof DialogPrimitive.Overlay>>
  export type Content = FC<ComponentProps<typeof DialogPrimitive.Content> & {
    darkenBackground?: boolean
    blockTransparency?: boolean
    theme?: "dark" | "light"
  }>
  export type Header = FC<React.HTMLAttributes<HTMLDivElement>>
  export type Footer = FC<React.HTMLAttributes<HTMLDivElement>>
  export type Title = FC<ComponentProps<typeof DialogPrimitive.Title>>
  export type Description = FC<ComponentProps<typeof DialogPrimitive.Description>>
}




const Root: DialogComponents.Root = (props) => <DialogPrimitive.Root {...props} />

const Trigger: DialogComponents.Trigger = (props) => <DialogPrimitive.Trigger {...props} />

const Portal: DialogComponents.Portal = (props) => <DialogPrimitive.Portal {...props} />

const Close: DialogComponents.Close = (props) => <DialogPrimitive.Close {...props} />

const Overlay: DialogComponents.Overlay = ({ className, ...rest }) => (
  <DialogPrimitive.Overlay
    className={cn(
      `fixed inset-0 z-50 bg-black/30 dark:bg-black/70 
      data-[state=open]:animate-in 
      data-[state=closed]:animate-out 
      data-[state=closed]:fade-out-0 
      data-[state=open]:fade-in-0`, className
    )}
    {...rest}
  />
)

const Content: DialogComponents.Content = ({
  children,
  style,
  className,
  blockTransparency = false,
  darkenBackground = true,
  theme,
  ...rest
}) => (
  <Portal>
    {darkenBackground && <Overlay />}
    <DialogPrimitive.Content
      className={classNames(
        `${theme || ""} fixed top-[50%] left-[50%] z-50 rounded-2xl
         border border-border outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0
         transition-[opacity,transform] duration-400 ease-in-out
         data-[state=open]:animate-in 
         data-[state=closed]:animate-out 
         data-[state=closed]:fade-out-0 
         data-[state=open]:fade-in-0 d
         ata-[state=closed]:zoom-out-70 
         data-[state=open]:zoom-in-70 
         data-[state=closed]:slide-out-to-left-1/2 
         data-[state=closed]:slide-out-to-top-[48%] 
         data-[state=open]:slide-in-from-left-1/2 
         data-[state=open]:slide-in-from-top-[48%]
         shadow-2xl shadow-neutral-500/60 dark:shadow-black/60
         `,
        blockTransparency ? 'bg-card' : ' bg-card/70 backdrop-blur-sm',
        className,
      )}
      style={{
        // boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.5)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </DialogPrimitive.Content>
  </Portal>
)

const Header: DialogComponents.Header = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 gap-1 text-center sm:text-left",
      className
    )}
    {...props}
  />
)

const Footer: DialogComponents.Footer = ({ className, ...rest }) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...rest}
  />
)

function Title({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-base font-medium sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2", className)}
      {...props}
    />
  )
}

function Description({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-muted-foreground *:[a]:hover:text-foreground text-sm text-balance md:text-pretty *:[a]:underline *:[a]:underline-offset-3", className)}
      {...props}
    />
  )
}

export const Dialog = {
  Root,
  Trigger,
  Portal,
  Close,
  Overlay,
  Content,
  Header,
  Footer,
  Title,
  Description,
}
