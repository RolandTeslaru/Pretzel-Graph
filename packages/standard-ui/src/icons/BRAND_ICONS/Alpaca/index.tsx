import alpacaIcon from "./alpaca_icon.webp";
import { cn } from "../../../utils/cn";

export const AlpacaIcon = ({ alt = "Alpaca", className, ...props }: any) => (
  <img
    src={alpacaIcon}
    alt={alt}
    width="1em"
    height="1em"
    draggable={false}
    className={cn("invert dark:invert-0", className)}
    {...props}
  />
);

export default AlpacaIcon;
