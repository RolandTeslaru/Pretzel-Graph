import React, { memo, useEffect } from 'react'
import { ExecutionSDK } from '../../sdk'
import { StackSDK } from '../../../StackSDK'
import { Content } from "./content"

const UoWInspectorSidebar = () => {

  const uowId = ExecutionSDK.useStore(s => s.timeline.selectedUoW)

  useEffect(() => {
    if (uowId) {
      StackSDK.actions.push("uowInspector" as StackSDK.Panel.Id, (props) => (
        <StackSDK.Template {...props}>
          <Content uowId={uowId} />
        </StackSDK.Template>
      ))
    } else {
      StackSDK.actions.pop("uowInspector" as StackSDK.Panel.Id)
    }
  }, [uowId])

  return null
}

export default UoWInspectorSidebar