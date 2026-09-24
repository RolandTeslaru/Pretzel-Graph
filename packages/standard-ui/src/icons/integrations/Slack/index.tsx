import type { ImgHTMLAttributes } from "react"
import src from "./slack.svg"

const Slack = (props: ImgHTMLAttributes<HTMLImageElement>) => (
  <img
    src={src}
    alt="Slack"
    width="1em"
    height="1em"
    draggable={false}
    style={{ display: "inline-block" }}
    {...props}
  />
)

export default Slack
