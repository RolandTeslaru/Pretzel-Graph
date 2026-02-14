import { nodeColorsName } from "@/utils/styleUtils";
import { Badge } from "@/vx-ui/foundations/Badge";
import { ShelfSDK } from "@/SDKs/ShelfSDK/sdk";

export function convertTestName(name: string): string {
  return name.replace(/ /g, "-").toLowerCase();
}


const TypeBadge = ({
  dataType,
  left,
  isInput
}: {
  dataType: string;
  left: boolean;
  isInput: boolean
}) => {

  const colorName = nodeColorsName[dataType] ?? "unknown";

  const style = {
    backgroundColor: left
      ? `var(--datatype-${colorName})`
      : `var(--datatype-${colorName}-foreground)`,
    color: left
      ? `var(--datatype-${colorName}-foreground)`
      : `var(--datatype-${colorName})`,
  };
  return (
    <Badge
      className="h-5 rounded-md px-1.5 cursor-pointer"
      style={style}
      data-testid={`${isInput ? "input" : "output"}-tooltip-${convertTestName(dataType)}`}
      onClick={() => {
        ShelfSDK.actions.searchFilter.toggleDataType(dataType)
      }}
    >
      {dataType}
    </Badge>
  )
}

export default TypeBadge