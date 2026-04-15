import { StackSDK } from '../sdk'

let counter = 0

const COLORS = [
    'bg-red-500/20',
    'bg-blue-500/20',
    'bg-green-500/20',
    'bg-purple-500/20',
    'bg-orange-500/20',
    'bg-pink-500/20',
]

const pushDummy = () => {
    const id = `dummy-${counter++}`
    const color = COLORS[counter % COLORS.length]

    StackSDK.actions.push(id, (props) => (
        <StackSDK.Template {...props}>
            <div className={`flex flex-col h-full ${color}`}>
                <div className='flex flex-row justify-between items-center px-4 py-3 border-b border-border'>
                    <h4 className='text-primary font-mono font-semibold text-lg'>{id}</h4>
                    <button
                        className='text-xs px-2 py-1 rounded bg-destructive/20 text-destructive hover:bg-destructive/30 cursor-pointer'
                        onClick={() => StackSDK.actions.pop(id)}
                    >
                        Pop
                    </button>
                </div>
                <div className='flex-1 flex items-center justify-center'>
                    <p className='text-muted-foreground text-sm'>Panel index: {props.index} / {props.stackSize}</p>
                </div>
            </div>
        </StackSDK.Template>
    ))
}

const StackDebugPanel = () => {
    const panels = StackSDK.useStore(s => s.panels)
    const ids = Array.from(panels.keys())

    return (
        <div className='fixed bottom-5 right-5 z-50 flex flex-col gap-2 bg-card/90 backdrop-blur-lg border border-border rounded-xl p-3 shadow-lg min-w-[200px]'>
            <h5 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Stack Debug</h5>

            <div className='flex flex-row gap-1 flex-wrap'>
                <button className='text-xs px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer' onClick={pushDummy}>Push</button>
                <button className='text-xs px-2 py-1 rounded bg-destructive/20 text-destructive hover:bg-destructive/30 cursor-pointer' onClick={() => StackSDK.actions.popAll()}>Pop All</button>
            </div>

            {ids.length > 0 && (
                <div className='flex flex-col gap-1 mt-1'>
                    {ids.map((id, i) => (
                        <div key={id} className='flex flex-row items-center gap-2 text-xs'>
                            <span className='text-muted-foreground w-4'>{i}</span>
                            <span className='text-foreground font-mono flex-1 truncate'>{id}</span>
                            <button className='text-primary hover:underline cursor-pointer' onClick={() => StackSDK.actions.bringToFront(id)}>↑</button>
                            <button className='text-primary hover:underline cursor-pointer' onClick={() => StackSDK.actions.sendToBack(id)}>↓</button>
                            <button className='text-destructive hover:underline cursor-pointer' onClick={() => StackSDK.actions.pop(id)}>✕</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default StackDebugPanel
