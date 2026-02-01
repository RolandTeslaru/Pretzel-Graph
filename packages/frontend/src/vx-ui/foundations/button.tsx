import * as React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn"


export const buttonVariants = cva(
  `
    cursor-pointer 
    focus-visible:border-ring 
    focus-visible:ring-ring/50 
    aria-invalid:ring-destructive/20 
    dark:aria-invalid:ring-destructive/40 
    aria-invalid:border-destructive 
    dark:aria-invalid:border-destructive/50 
    rounded-lg border border-transparent bg-clip-padding text-sm font-medium 
    focus-visible:ring-[3px] 
    aria-invalid:ring-[3px] 
    [&_svg:not([class*='size-'])]:size-4 
    [&_svg]:pointer-events-none 
    inline-flex items-center justify-center whitespace-nowrap transition-all 
    disabled:pointer-events-none disabled:opacity-50 
    shrink-0 [&_svg]:shrink-0 outline-none group/button select-none
  `,
  {
    variants: {
      variant: {
        default: "bg-primary border-primary-accent text-primary-foreground hover:bg-primary-hover [a]:hover:bg-primary/80",
        outline: "border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost: "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive: "bg-destructive/10 border-destructive/50 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30",
        warning: "bg-yellow-500/10 border-yellow-500/50 hover:bg-yellow-500/20 focus-visible:ring-yellow-500/20 dark:focus-visible:ring-yellow-500/40 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 focus-visible:border-yellow-500/40 dark:hover:bg-yellow-500/30",
        success: "bg-green-500/10 border-green-500/50 hover:bg-green-500/20 focus-visible:ring-green-500/20 dark:focus-visible:ring-green-500/40 dark:bg-green-500/20 text-green-600 dark:text-green-400 focus-visible:border-green-500/40 dark:hover:bg-green-500/30",
        accent: "bg-accent/10 border-accent/50 hover:bg-accent/20 focus-visible:ring-accent/20 dark:focus-visible:ring-accent/40 dark:bg-accent/20 text-accent-foreground focus-visible:border-accent/40 dark:hover:bg-accent/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-lg),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-lg),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs": "size-6 rounded-full! in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-full! in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// shadow-[0px_0px_8px_0.7px_oklch(0.58_0.2152_27.33)]
// shadow-[0px_0px_8px_0.7px_oklch(0.860_0.1731_91.94)]

interface IconProps {
  Icon: React.ElementType;
  iconPlacement: "left" | "right";
}

interface IconRefProps {
  Icon?: never;
  iconPlacement?: undefined;
}

export type ButtonIconProps = IconProps | IconRefProps;

export interface ButtonProps {
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  asChild?: boolean;
  shouldBounce?: boolean;
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  shouldBounce = true,
  ...props
}: React.ComponentProps<"button"> & ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={
        cn(
          buttonVariants({ variant, size, className }),
          shouldBounce && "active:scale-[0.95]",
        )
      }
      {...props}
    >
      <Slottable>{props.children}</Slottable>
    </Comp>
  );
}
Button.displayName = "Button";

export { Button };

const BracketSizes = {
  default: "w-2.5 h-2.5",
  sm: "w-1.5 h-1.5 !animate-none",
  xs: "w-1 h-1",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
  icon: "w-3 h-3",
} as const

export const ButtonDecorations: Record<
  "destructive" | "accent" | "warning" | "primary" | "default" | "success",
  (sizeKey: keyof typeof BracketSizes) => React.JSX.Element
> = {
  destructive: (sizeKey) => (
    <>
      <div className={`bracketCornerTL absolute top-[-1px] left-[-1px] ${BracketSizes[sizeKey]}     border-red-500/70 border-l-2 border-t-2 rounded-tl-xs  group-hover:-top-1.5     group-hover:-left-1.5   group-hover:animate-rapid-pulse transition-[top,left] duration-100`} />
      <div className={`bracketCornerTR absolute top-[-1px] right-[-1px] ${BracketSizes[sizeKey]}    border-red-500/70 border-r-2 border-t-2 rounded-tr-xs  group-hover:-top-1.5     group-hover:-right-1.5  group-hover:animate-rapid-pulse transition-[top,right] duration-100`} />
      <div className={`bracketCornerBL absolute bottom-[-1px] left-[-1px] ${BracketSizes[sizeKey]}  border-red-500/70 border-l-2 border-b-2 rounded-bl-xs  group-hover:-bottom-1.5  group-hover:-left-1.5   group-hover:animate-rapid-pulse transition-[bottom,left] duration-100`} />
      <div className={`bracketCornerBR absolute bottom-[-1px] right-[-1px] ${BracketSizes[sizeKey]} border-red-500/70 border-r-2 border-b-2 rounded-br-xs  group-hover:-bottom-1.5  group-hover:-right-1.5  group-hover:animate-rapid-pulse transition-[bottom,right] duration-100`} />
    </>
  ),
  accent: (sizeKey) => (
    <>
      <div className={`bracketCornerTL absolute top-[-1px] left-[-1px] ${BracketSizes[sizeKey]}     border-accent-secondary/70 border-l-2 border-t-2 rounded-tl-xs  group-hover:-top-1.5     group-hover:-left-1.5   group-hover:animate-rapid-pulse transition-[top,left] duration-100`} />
      <div className={`bracketCornerTR absolute top-[-1px] right-[-1px] ${BracketSizes[sizeKey]}    border-accent-secondary/70 border-r-2 border-t-2 rounded-tr-xs  group-hover:-top-1.5     group-hover:-right-1.5  group-hover:animate-rapid-pulse transition-[top,right] duration-100`} />
      <div className={`bracketCornerBL absolute bottom-[-1px] left-[-1px] ${BracketSizes[sizeKey]}  border-accent-secondary/70 border-l-2 border-b-2 rounded-bl-xs  group-hover:-bottom-1.5  group-hover:-left-1.5   group-hover:animate-rapid-pulse transition-[bottom,left] duration-100`} />
      <div className={`bracketCornerBR absolute bottom-[-1px] right-[-1px] ${BracketSizes[sizeKey]} border-accent-secondary/70 border-r-2 border-b-2 rounded-br-xs  group-hover:-bottom-1.5  group-hover:-right-1.5  group-hover:animate-rapid-pulse transition-[bottom,right] duration-100`} />
    </>
  ),
  warning: (sizeKey) => (
    <>
      <div className={`bracketCornerTL absolute top-[-1px] left-[-1px] ${BracketSizes[sizeKey]}     border-yellow-300/70 border-l-2 border-t-2 rounded-tl-xs  group-hover:-top-1.5     group-hover:-left-1.5   group-hover:animate-rapid-pulse transition-[top,left] duration-100`} />
      <div className={`bracketCornerTR absolute top-[-1px] right-[-1px] ${BracketSizes[sizeKey]}    border-yellow-300/70 border-r-2 border-t-2 rounded-tr-xs  group-hover:-top-1.5     group-hover:-right-1.5  group-hover:animate-rapid-pulse transition-[top,right] duration-100`} />
      <div className={`bracketCornerBL absolute bottom-[-1px] left-[-1px] ${BracketSizes[sizeKey]}  border-yellow-300/70 border-l-2 border-b-2 rounded-bl-xs  group-hover:-bottom-1.5  group-hover:-left-1.5   group-hover:animate-rapid-pulse transition-[bottom,left] duration-100`} />
      <div className={`bracketCornerBR absolute bottom-[-1px] right-[-1px] ${BracketSizes[sizeKey]} border-yellow-300/70 border-r-2 border-b-2 rounded-br-xs  group-hover:-bottom-1.5  group-hover:-right-1.5  group-hover:animate-rapid-pulse transition-[bottom,right] duration-100`} />
    </>
  ),
  success: (sizeKey) => (
    <>
      <div className={`bracketCornerTL absolute top-[-1px] left-[-1px] ${BracketSizes[sizeKey]}     border-green-500/70 border-l-2 border-t-2 rounded-tl-xs  group-hover:-top-1.5     group-hover:-left-1.5   group-hover:animate-rapid-pulse transition-[top,left] duration-100`} />
      <div className={`bracketCornerTR absolute top-[-1px] right-[-1px] ${BracketSizes[sizeKey]}    border-green-500/70 border-r-2 border-t-2 rounded-tr-xs  group-hover:-top-1.5     group-hover:-right-1.5  group-hover:animate-rapid-pulse transition-[top,right] duration-100`} />
      <div className={`bracketCornerBL absolute bottom-[-1px] left-[-1px] ${BracketSizes[sizeKey]}  border-green-500/70 border-l-2 border-b-2 rounded-bl-xs  group-hover:-bottom-1.5  group-hover:-left-1.5   group-hover:animate-rapid-pulse transition-[bottom,left] duration-100`} />
      <div className={`bracketCornerBR absolute bottom-[-1px] right-[-1px] ${BracketSizes[sizeKey]} border-green-500/70 border-r-2 border-b-2 rounded-br-xs  group-hover:-bottom-1.5  group-hover:-right-1.5  group-hover:animate-rapid-pulse transition-[bottom,right] duration-100`} />
    </>
  ),
  primary: (sizeKey) => (
    <>
      <div className={`bracketCornerTL absolute top-[-1px] left-[-1px] ${BracketSizes[sizeKey]}     border-white/70 border-l-2 border-t-2 rounded-tl-xs  group-hover:-top-1.5     group-hover:-left-1.5   group-hover:animate-rapid-pulse transition-[top,left] duration-100`} />
      <div className={`bracketCornerTR absolute top-[-1px] right-[-1px] ${BracketSizes[sizeKey]}    border-white/70 border-r-2 border-t-2 rounded-tr-xs  group-hover:-top-1.5     group-hover:-right-1.5  group-hover:animate-rapid-pulse transition-[top,right] duration-100`} />
      <div className={`bracketCornerBL absolute bottom-[-1px] left-[-1px] ${BracketSizes[sizeKey]}  border-white/70 border-l-2 border-b-2 rounded-bl-xs  group-hover:-bottom-1.5  group-hover:-left-1.5   group-hover:animate-rapid-pulse transition-[bottom,left] duration-100`} />
      <div className={`bracketCornerBR absolute bottom-[-1px] right-[-1px] ${BracketSizes[sizeKey]} border-white/70 border-r-2 border-b-2 rounded-br-xs  group-hover:-bottom-1.5  group-hover:-right-1.5  group-hover:animate-rapid-pulse transition-[bottom,right] duration-100`} />
    </>
  ),
  default: (sizeKey) => (
    <>
    </>
  )
};