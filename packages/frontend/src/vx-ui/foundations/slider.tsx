import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { type ComponentProps, type FC } from "react"

import { cn } from "../utils/cn"
import { cva } from "class-variance-authority"

export const rootVars = cva(
  "relative flex w-full touch-none select-none items-center data-[disabled]:opacity-50  data-[orientation=vertical]:min-h-40",
  {
    variants: {
      variant: {
        default: "",
        accent: "",
      }
    }
  }
)

export const trackVars = cva(
  "relative shadow-sm shadow-black/20 bg-muted grow overflow-hidden rounded-full data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2.5",
  {
    variants: {
      variant: {
        default: "",
        accent: "",
      }
    }
  }
)

export const rangeVars = cva(
  "absolute select-none bg-primary rounded-md  data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
  {
    variants: {
      variant: {
        default: "",
        accent: " bg-primary border-l border-t border-b  border-primary-accent",
      }
    }
  }
)

export const thumbVars = cva(
  "cursor-pointer relative block h-2.5 w-2.5 rounded-full bg-white border border-neutral-300 shrink-0 select-none ring-offset-background transition-[color,box-shadow] after:absolute after:-inset-2 hover:ring-[3px] hover:ring-ring/50 focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50 active:ring-[3px] active:ring-ring/50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  {
    variants: {
      variant: {
        default: "",
        accent: "",
      }
    }
  }
)

export type SliderVariants = "default" | "accent"

const Slider = ({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  onDragStart,
  onDragEnd,
  variant = "default",
  ...props
}: ComponentProps<typeof SliderPrimitive.Root> & {
  onDragStart?: (event: any) => void;
  onDragEnd?: (event: any) => void;
  variant?: SliderVariants;
}) => {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  const handlePointerDown = (event: any) => {
    onDragStart?.(event);
  }

  const handlePointerUp = (event: any) => {
    onDragEnd?.(event);
  }

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(rootVars({ variant }), className)}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(trackVars({ variant }))}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(rangeVars({ variant }))}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className={cn(thumbVars({ variant }))}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        />
      ))}
    </SliderPrimitive.Root>
  )
}
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
