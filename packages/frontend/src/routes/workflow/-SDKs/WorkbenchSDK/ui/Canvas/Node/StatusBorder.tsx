import { memo } from 'react'
import { cn } from '@/utils/styleUtils';
import type { ExecutionSession } from '@pretzel-graph/shared/domain';

interface StatusBorderProps {
  status: ExecutionSession.NodeStatus['status'] | undefined
  backgroundColor: string
  isClicked?: boolean
}

export const StatusBorder = memo(({ status, backgroundColor, isClicked }: StatusBorderProps) => {
  if ((!status || status === "idle") && !isClicked) return null;

  if (isClicked && (!status || status === "idle")) {
    return (
      <div
        className="absolute z-[-1] rounded-4xl pointer-events-none"
        style={{ inset: -7, background: "var(--muted-foreground)", opacity: 0.35 }}
      />
    );
  }

  if (status === "failed") {
    return (
      <>
        <div
          className="absolute z-[-1] rounded-4xl pointer-events-none"
          style={{ inset: -7, background: "var(--destructive)", opacity: 0.6 }}
        />
        <div
          className="absolute z-[-1] rounded-4xl pointer-events-none animate-ping-fixed-10"
          style={{ inset: -7, background: "var(--destructive)", opacity: 0.6 }}
        />
        <div
          className="absolute z-[-1] rounded-[calc(2rem-3px)] pointer-events-none"
          style={{ background: backgroundColor }}
        />
      </>
    );
  }

  return (
    <div
      className={cn(
        'absolute z-[-1] rounded-4xl pointer-events-none overflow-hidden',
        status === "waiting" && "animate-pulse",
      )}
      style={{ inset: status === "completed" ? -5 : -7 }}
    >
      {/* Gradient fill / spinning beam */}
      <div
        className="absolute inset-0"
        style={status === "running" ? {
          background: "conic-gradient(from 0deg, transparent 60%, var(--status-active) 80%, var(--status-active) 90%, transparent 100%)",
          animation: "spin 1.5s linear infinite",
          inset: "-40%",
        } : {
          background: status === "waiting"
              ? "var(--status-waiting)"
              : "transparent",
          opacity: 0.6,
        }}
      />
    </div>
  );
});
