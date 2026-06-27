import type { ImgHTMLAttributes } from "react"
import src from "./google-search.png";

const SvgGoogleSearch = (props: ImgHTMLAttributes<HTMLImageElement>) => (
  <img src={src} width="1em" height="1em" style={{ display: "inline-block" }} {...props} />
);
export default SvgGoogleSearch;
