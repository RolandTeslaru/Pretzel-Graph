import { ShelfSDK } from '@/routes/workflow/-SDKs/ShelfSDK/sdk'
import { Badge } from '@vx-agent-editor/vx-ui/foundations'
import type { Foundations } from '@vx-agent-editor/shared/domain'
import React from 'react'

interface Props {
  portVariant: Foundations.Port.Variant
}

export const PortBadge: React.FC<Props> = ({ portVariant }) => {
  return (
    <Badge
      className="h-5 rounded-md px-1.5 cursor-pointer border"
      style={{
        backgroundColor: `color-mix(in srgb, var(--port-${portVariant}) 20%, transparent)`,
        color: `var(--port-${portVariant}-foreground)`,
        borderColor: `var(--port-${portVariant})`
      }}
      onClick={() => {
        ShelfSDK.actions.searchFilter.toggleDataType(portVariant)
      }}
    >
      {portVariant}
    </Badge>
  )
}