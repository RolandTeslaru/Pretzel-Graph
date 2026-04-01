import { createContext, useContext } from 'react'
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain'

type Value = Foundations.Field.Condition.Value

type ConditionContextValue = {
    nodeId: Workflow.Node.Id
    field: Foundations.Field
    root: Value
}

export const ConditionContext = createContext<ConditionContextValue | null>(null)

export const useConditionContext = (): ConditionContextValue => {
    const ctx = useContext(ConditionContext)
    if (!ctx) throw new Error('useConditionContext must be used within ConditionField')
    return ctx
}
