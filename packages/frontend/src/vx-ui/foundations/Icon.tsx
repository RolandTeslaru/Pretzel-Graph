import React, { Suspense, lazy, ComponentType } from "react";
import { Skeleton } from "./skeleton"
import * as SystemIcons from "@/vx-ui/icons/system"
import { getBrandIcon, hasBrandIcon } from "@/vx-ui/icons/brand"
import type { BaseIconProps } from "@/vx-ui/icons/baseIcon"

export type IconProps = {
  name: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  fallback?: React.ReactNode;
  "data-testid"?: string;
  strategy?: "lazy" | "eager"
};

type IconResource =
  | {
    status: "pending";
    promise: Promise<void>;
  }
  | {
    status: "resolved";
    component: ComponentType<BaseIconProps>;
  }
  | {
    status: "rejected";
    error: unknown;
  };

const iconCache = new Map<string, IconResource>();

/**
 * Try to get a system icon (eagerly loaded from system.tsx)
 */
const getSystemIcon = (name: string): ComponentType<BaseIconProps> | null => {
  return (SystemIcons as Record<string, ComponentType<BaseIconProps>>)[name] ?? null;
};

/**
 * Read icon with Suspense pattern
 */
const readIcon = (name: string): ComponentType<BaseIconProps> | null => {
  // First try system icons (sync, no Suspense needed)
  const systemIcon = getSystemIcon(name);
  if (systemIcon) return systemIcon;

  // Then try brand icons (lazy loaded)
  const cached = iconCache.get(name);

  if (cached?.status === "resolved") return cached.component;
  if (cached?.status === "rejected") return null;
  if (cached?.status === "pending") throw cached.promise;

  // Check if it's a brand icon
  if (!hasBrandIcon(name)) {
    return null;
  }

  // Start loading the brand icon
  const LazyIcon = getBrandIcon(name);
  if (!LazyIcon) return null;

  const pending: IconResource = {
    status: "pending",
    promise: new Promise<void>((resolve, reject) => {
      // Preload the component
      const preloader = (LazyIcon as any)._payload?.then
        ? (LazyIcon as any)._payload
        : Promise.resolve();

      preloader
        .then(() => {
          iconCache.set(name, {
            status: "resolved",
            component: LazyIcon as unknown as ComponentType<BaseIconProps>
          });
          resolve();
        })
        .catch((error: unknown) => {
          iconCache.set(name, { status: "rejected", error });
          reject(error);
        });
    }),
  };

  iconCache.set(name, pending);
  throw pending.promise;
};

const IconInner = ({ name, className, style, title, "data-testid": testId }: IconProps) => {
  if (!name) return null;

  // Try system icons first (sync)
  const SystemIcon = getSystemIcon(name);
  if (SystemIcon) {
    return (
      <SystemIcon
        className={className}
        style={style}
        title={title}
        data-testid={testId ?? `icon-${name}`}
      />
    );
  }

  // Try brand icons (lazy)
  const LazyBrandIcon = getBrandIcon(name);
  if (LazyBrandIcon) {
    return (
      <LazyBrandIcon
        className={className}
        style={style}
        title={title}
        data-testid={testId ?? `icon-${name}`}
      />
    );
  }

  return null;
};

const FallbackIcon = ({ className }: { className?: string }) => {
  return (
    <div className="flex items-center justify-center">
      <Skeleton className={" h-4 w-4 " + (className ?? "")} />
    </div>
  )
}

export const Icon = (props: IconProps) => {
  // For system icons, render immediately without Suspense overhead
  const SystemIcon = getSystemIcon(props.name);
  if (SystemIcon) {
    return (
      <SystemIcon
        className={props.className}
        style={props.style}
        title={props.title}
        data-testid={props["data-testid"] ?? `icon-${props.name}`}
      />
    );
  }

  // For brand icons (lazy), use Suspense
  return (
    <Suspense fallback={<FallbackIcon className={props.className} />}>
      <IconInner {...props} />
    </Suspense>
  );
};
