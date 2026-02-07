import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva } from "class-variance-authority"
import { cn } from "../utils/cn"


const labelVariants = cva(
  "text-xs font-medium  text-label-secondary leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      variant: {
        default: "",
        secondary: " font-mono! "
      }
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Label = ({ className, variant, ...props }: React.ComponentProps<typeof LabelPrimitive.Root> & { variant?: "default" | "secondary"} ) => (
  <LabelPrimitive.Root
    className={cn(labelVariants({ variant }), className)}
    {...props}
  />
)
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
