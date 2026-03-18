import { Label } from "@vx-agent-editor/vx-ui/foundations/label"
import type { Foundations } from "@vx-agent-editor/shared/domain"
import { PortBadge } from "../PortBadge"

export const InputLabel = ({ input, showTypeBadges = true, isFlipped }: { input: Foundations.Port.Input, showTypeBadges?: boolean, isFlipped?: boolean }) => {
  return (
    <Label className={`text-sm font-medium flex items-center ${isFlipped ? 'flex-row-reverse' : ''}`}>
      {input.displayName}
      {input.required && <span className={`text-red-500 ${isFlipped ? 'mr-1' : 'ml-1'}`}>*</span>}
      {showTypeBadges && (
        <div className={`flex flex-row gap-1 my-auto ${isFlipped ? 'mr-auto' : 'ml-auto'}`}>
          <PortBadge portVariant={input.variant} />
        </div>
      )}
    </Label>
  )
}
