/*
 * PretzelGraph — https://github.com/RolandTeslaru/Pretzel-Graph
 * Elastic License 2.0. See LICENSE.
 */
import "reflect-metadata"
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import './index.css'
import { SystemSDK } from '@pretzel-graph/standard-ui/SDKs/SystemSDK/sdk'
import { AuthSDK } from './SDKs/AuthSDK/sdk'
import { routeTree } from './routeTree.gen'
import { Spinner } from "@pretzel-graph/standard-ui/foundations"

SystemSDK.init()
AuthSDK.init()


export const router = createRouter({
  routeTree,
  context: {
    auth: undefined!, // passed in the provider
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

/** Held here rather than per route, so no loader runs before the backend answers. */
function Waiting({ title, detail, onRetry }: { title: string, detail?: string, onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-6 text-center">
      {!onRetry && <Spinner />}
      <p className="text-sm font-medium">{title}</p>
      {detail && <p className="text-xs opacity-60 max-w-xs">{detail}</p>}
      {onRetry && (
        <button className="mt-1 px-3 py-1.5 text-xs rounded border hover:bg-muted" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

function App() {
  const auth = AuthSDK.useStore()

  if (auth.hasSession === null)
    return <Waiting title="Checking your session" />

  if (auth.hasSession && auth.access === 'checking')
    return <Waiting title="Connecting to your workspace" />

  if (auth.hasSession && auth.access === 'unreachable')
    return (
      <Waiting
        title="This workspace is not responding"
        detail="It may still be starting up."
        onRetry={() => window.location.reload()}
      />
    )

  return <RouterProvider router={router} context={{ auth }} />
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement)
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
