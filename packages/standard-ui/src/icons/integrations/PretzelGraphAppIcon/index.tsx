import type { ImgHTMLAttributes } from "react"
import src from "./pretzel-logo.png";

const PretzelGraphAppIcon = (props: ImgHTMLAttributes<HTMLImageElement>) => (
  <img src={src} alt="PretzelGraph" width="1em" height="1em" draggable={false} style={{ display: "inline-block" }} {...props} />
);
export default PretzelGraphAppIcon;
