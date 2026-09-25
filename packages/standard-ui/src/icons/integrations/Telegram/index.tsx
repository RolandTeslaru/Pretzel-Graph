import type { ImgHTMLAttributes } from "react"
import src from "./telegram.svg"

const Telegram = (props: ImgHTMLAttributes<HTMLImageElement>) => (
  <img
    src={src}
    alt="Telegram"
    width="1em"
    height="1em"
    draggable={false}
    style={{ display: "inline-block" }}
    {...props}
  />
)

export default Telegram
