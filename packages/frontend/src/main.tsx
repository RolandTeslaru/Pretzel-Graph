import "reflect-metadata"
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import './index.css'
import { SystemSDK } from './SDKs/SystemSDK/sdk'
import { AuthSDK } from './SDKs/AuthSDK/sdk'
import { routeTree } from './routeTree.gen'
import { Spinner } from "@vx-agent-editor/vx-ui/foundations"

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

function App() {
  const auth = AuthSDK.useStore()

  if (auth.isLoading) {
    return <div className="flex items-center justify-center min-h-screen gap-4">
      <p>Authenticating...</p>
      <Spinner/>
    </div>
  }

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
