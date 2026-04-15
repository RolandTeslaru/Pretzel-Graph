import { Label } from "@vx-agent-editor/vx-ui/foundations/label"
import type { Foundations } from "@vx-agent-editor/shared/domain"

export type InputLabelVariant = "default" | "section" | "inline" | "meta" | "secondary"
export type InputLabelSize = "xs" | "sm" | "md" | "lg"

export const InputLabel = ({ input, isFlipped, variant, size }: { input: Foundations.Port.Input, isFlipped?: boolean, variant?: InputLabelVariant, size?: InputLabelSize }) => {
  return (
    <Label variant={variant} size={size} className={`flex items-center ${isFlipped ? 'flex-row-reverse' : ''}`}>
      {input.displayName}
      {input.required && <span className={`text-red-500 ${isFlipped ? 'mr-1' : 'ml-1'}`}>*</span>}
    </Label>
  )
}
