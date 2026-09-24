import type { ImgHTMLAttributes } from "react"
import src from "./discord.svg"

const Discord = (props: ImgHTMLAttributes<HTMLImageElement>) => (
  <img
    src={src}
    alt="Discord"
    width="1em"
    height="1em"
    draggable={false}
    style={{ display: "inline-block" }}
    {...props}
  />
)

export default Discord
