import { Label } from "@/vx-ui/foundations/label"
import type { Foundations } from "@vx-agent-editor/shared/domain"
import { PortBadge } from "../PortBadge"

export const InputLabel = ({ input, showTypeBadges = true }: { input: Foundations.Port.Input, showTypeBadges?: boolean }) => {
  return (
    <Label className="text-sm font-medium flex items-center">
      {input.displayName}
      {input.required && <span className="text-red-500 ml-1">*</span>}
      {showTypeBadges && (
        <div className='ml-auto flex flex-row gap-1 my-auto'>
          <PortBadge portVariant={input.variant} />
        </div>
      )}
    </Label>
  )
}
