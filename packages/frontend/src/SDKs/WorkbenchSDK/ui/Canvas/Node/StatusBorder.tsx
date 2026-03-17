import { memo } from 'react'
import { cn } from '@/utils/styleUtils';
import type { ExecutionSession } from '@vx-agent-editor/shared/domain';

interface StatusBorderProps {
  status: ExecutionSession.NodeStatus['status'] | undefined
  backgroundColor: string
}

export const StatusBorder = memo(({ status, backgroundColor }: StatusBorderProps) => {
  if (!status || status === "idle") return null;

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
      style={{ inset: -7 }}
    >
      {/* Gradient fill / spinning beam */}
      <div
        className="absolute inset-0"
        style={status === "running" ? {
          background: "conic-gradient(from 0deg, transparent 60%, var(--status-active) 80%, var(--status-active) 90%, transparent 100%)",
          animation: "spin 1.5s linear infinite",
          inset: "-40%",
        } : {
          background: status === "completed"
            ? "var(--status-success)"
            : status === "waiting"
              ? "var(--status-waiting)"
              : "transparent",
          opacity: 0.6,
        }}
      />
    </div>
  );
});
