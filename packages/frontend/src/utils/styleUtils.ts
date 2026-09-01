import type { Foundations } from "@pretzel-graph/shared/domain";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// CSS custom-property base for a port variant's colour triple
// (`--port-X`, `--port-X-foreground`, `--port-X-accent`), declared in standard-ui/styles.css.
export function portColorVar(variant: Foundations.Port.Variant): string {
  // UnresolvedScalar has no palette entry of its own; it borrows Unresolved's.
  return `--port-${variant === "UnresolvedScalar" ? "Unresolved" : variant}`;
}
