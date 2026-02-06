import { Button, Input } from "@/vx-ui/foundations"
import { useState } from "react"
import { NotificationSDK } from "../sdk";

export const NotificationSDKTestPanel = () => {
  
    const [text, setText] = useState<string>("");

    return (
    <div className="flex flex-col gap-1 p-1">
        <Input value={text} onChange={e => setText(e.currentTarget.value)} placeholder="Type anything here"/>       
        <Button variant="success" onClick={() => NotificationSDK.toast.success(text)}>Success</Button>
        <Button variant="secondary" onClick={() => NotificationSDK.toast.info(text)}>Info</Button>
        <Button variant="warning" onClick={() => NotificationSDK.toast.warning(text)}>Warning</Button>
        <Button variant="destructive" onClick={() => NotificationSDK.toast.error(text)}>Error</Button>
        <Button variant="destructive" onClick={() => NotificationSDK.toast(
            <div className="bg-green-400">
            dadasdasdasdasd
            </div>
        )}>Toast</Button>
    </div>
  )
}