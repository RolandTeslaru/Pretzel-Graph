import React, { memo, useEffect } from 'react'
import { useTimelineViewerStore } from '../../timeline-viewer-store'
import { StackSDK } from '../../../StackSDK'
import { Content } from "./content"

const UoWInspectorSidebar = () => {

  const uowId = useTimelineViewerStore(s => s.selectedUoW)

  useEffect(() => {
    if(uowId){
      StackSDK.actions.push("uowInspector" as StackSDK.Panel.Id, (props) => (
        <StackSDK.Template {...props}>
          <Content uowId={uowId} />
        </StackSDK.Template>
      ))
    }
  }, [uowId])

  return null
}

export default UoWInspectorSidebar