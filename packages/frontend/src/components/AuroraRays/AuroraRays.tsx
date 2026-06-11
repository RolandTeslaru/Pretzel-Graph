import { cn } from "@/utils/styleUtils";
import React from "react";

interface AuroraRaysProps extends React.HTMLAttributes<HTMLDivElement> {
  showRadialGradient?: boolean;
}

/**
 * CSS-only aurora background (adapted from Aceternity UI's AuroraBackground).
 * No WebGL / ogl — it's an animated `repeating-linear-gradient` on the compositor.
 *
 * NOTE: the original Aceternity component uses an `invert` filter +
 * `mix-blend-difference` to auto-adapt to light/dark. That trick produces
 * unpredictable hues (orange in dark, blue in light) and a white wash on dark
 * panels, so we render the aurora gradient directly instead — true colors,
 * identical in both themes, no white wash.
 *
 * Renders an absolutely-positioned background layer that fills its nearest
 * positioned ancestor — drop it inside a `relative`/`absolute` container.
 */
export const AuroraRays = ({
  className,
  showRadialGradient = true,
  ...props
}: AuroraRaysProps) => {
  return (
    <div
      className={cn("absolute inset-0 overflow-hidden", className)}
      {...props}
    >
      <div
        className={cn(
          `animate-aurora pointer-events-none absolute -inset-[10px] [background-image:var(--aurora)] [background-size:200%,_200%] [background-position:50%_50%] opacity-50 blur-[10px] will-change-transform [--aurora:repeating-linear-gradient(100deg,transparent_0%,transparent_3%,#60a5fa_7%,#3b82f6_11%,transparent_15%,transparent_21%,#e879f9_25%,#f472b6_29%,transparent_33%,transparent_39%)]`,

          showRadialGradient &&
            `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]`,
        )}
      ></div>
    </div>
  );
};

export default AuroraRays;
