import { Foundations } from '@pretzel-graph/shared/domain'
import { DropdownMenu } from '@pretzel-graph/vx-ui/foundations'
import { SystemIcons } from '@pretzel-graph/vx-ui/icons'
import { dataTypeLabel, operatorLabel } from './utils'

const Operator = Foundations.Field.Condition.Operator
type Operator  = Foundations.Field.Condition.Operator
const DataType = Foundations.Field.Condition.DataType
type DataType  = Foundations.Field.Condition.DataType

type Props = {
    operator: Operator
    dataType: DataType
    onSelect: (op: Operator, dataType: DataType) => void
}

export const OperatorSelector = ({ operator, dataType, onSelect }: Props) => {
    return (
        <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger className="w-37.5! inline-flex items-center justify-between border-transparent bg-transparent shadow-none rounded-md border h-5 px-1.5 text-xs gap-1 font-semibold cursor-pointer outline-none">
                <span className="truncate">{operatorLabel(operator)}</span>
                <SystemIcons.ChevronDown className="size-3 shrink-0 opacity-50" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
                {DataType.options.map((dt) => {
                    const ops = Operator.MAP[dt]
                    return (
                        <DropdownMenu.Sub key={dt}>
                            <DropdownMenu.SubTrigger className={dataType === dt ? "text-primary-accent!" : undefined}>
                                {dataTypeLabel(dt)}
                            </DropdownMenu.SubTrigger>
                            <DropdownMenu.SubContent>
                                {ops.options.map((op) => (
                                    <DropdownMenu.Item
                                        key={op}
                                        onSelect={() => onSelect(op as Operator, dt)}
                                        className="gap-2"
                                    >
                                        <span className="size-3 shrink-0 flex items-center justify-center">
                                            {operator === op && <SystemIcons.Check className="size-3 text-primary-accent!" />}
                                        </span>
                                        {operatorLabel(op)}
                                    </DropdownMenu.Item>
                                ))}
                            </DropdownMenu.SubContent>
                        </DropdownMenu.Sub>
                    )
                })}
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    )
}
