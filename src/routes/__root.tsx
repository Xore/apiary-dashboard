import { createRootRoute } from '@tanstack/react-router'
import { Outlet, ScrollToTop } from '@tanstack/react-router'
import Providers from '@/components/Providers'
import { TooltipProvider } from '@/components/ui/tooltip'
import DownloadButton from '@/components/layout/Download'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <TooltipProvider>
      <Providers sidebarDefaultOpen={true}>
        <ScrollToTop />
        <Outlet />
        <DownloadButton />
      </Providers>
    </TooltipProvider>
  )
}
