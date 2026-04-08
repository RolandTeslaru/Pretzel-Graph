import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva } from "class-variance-authority"
import { cn } from "../utils/cn"


const labelVariants = cva(
  "leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      variant: {
        // Inspector field label — small, muted, recedes behind the input value
        default: "text-xs font-medium text-muted-foreground",
        // Accordion / section header — full contrast, dominates the panel
        section: "text-sm font-semibold text-foreground tracking-tight",
        // Inline label (e.g. boolean row, slider row) — small but full contrast
        inline: "text-xs font-medium text-foreground",
        // Uppercase metadata label — Figma/Blender-style inspector heading
        meta: "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
        // Monospaced variant for keys / identifiers
        secondary: "text-xs font-mono text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type Variant = "default" | "section" | "inline" | "meta" | "secondary"

type Props = React.ComponentProps<typeof LabelPrimitive.Root> & {
  variant?: Variant
  required?: boolean
}

const Label: React.FC<Props> = ({ className, variant, children, required = false, ...props }) => (
  <LabelPrimitive.Root
    className={cn(labelVariants({ variant }), className)}
    {...props}
  >
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </LabelPrimitive.Root>
)
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
