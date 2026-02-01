import React, { Suspense } from "react";
import { Skeleton } from "./skeleton"

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
    component: any;
  }
  | {
    status: "rejected";
    error: unknown;
  };

const iconCache = new Map<string, IconResource>();

const readIcon = (name: string): any => {
  const cached = iconCache.get(name);
  if (cached?.status === "resolved") return cached.component;
  if (cached?.status === "rejected") return null;
  if (cached?.status === "pending") throw cached.promise;

  const pending: IconResource = {
    status: "pending",
    // @ts-expect-error
    promise: getNodeIcon(name)
      .then((component) => {
        iconCache.set(name, { status: "resolved", component });
      })
      .catch((error) => {
        iconCache.set(name, { status: "rejected", error });
      }),
  };

  iconCache.set(name, pending);
  throw pending.promise;
};

const IconInner = ({ name, className, style, title, "data-testid": testId }: IconProps) => {
  return null
  if (!name) return null;
  const TargetIcon = readIcon(name);
  if (!TargetIcon) return null;

  return (
    <TargetIcon
      className={className}
      style={style}
      title={title}
      data-testid={testId ? testId : `icon-${name}`}
    />
  );
};

const FallbackIcon = ({ className }: { className: string }) => {
  return (
    <div className="flex items-center justify-center">
      <Skeleton className={" h-4 w-4 " + className} />
    </div>
  )
}

export const Icon = (props: IconProps) => {
  return (
    <Suspense fallback={<FallbackIcon className={props.className ?? ""} />}>
      <IconInner {...props} />
    </Suspense>
  );
};
