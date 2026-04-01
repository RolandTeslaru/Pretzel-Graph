import { useEffect, useRef } from "react"
import { SandboxSDK } from "../sdk"

export default function SandboxFrame() {
    const ref = useRef<HTMLIFrameElement>(null)

    useEffect(() => {
        if (ref.current) {
            SandboxSDK.reducers.setIframe(ref.current)
        }
    }, [])

    return (
        <iframe
            ref={ref}
            sandbox="allow-scripts"
            srcDoc ={SandboxSDK.srcdoc}
            style={{ display: 'none' }}
            title="sandbox"
        />
    )
}
