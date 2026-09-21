import { createFileRoute, Outlet } from '@tanstack/react-router'
import Footer from '@/components/layout/Footer'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import { SidebarInset } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { Suspense } from 'react'

export const Route = createFileRoute('/_pages')({
  component: PagesLayout,
})

function PagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex h-full w-full min-w-0'>
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <SidebarInset className='flex flex-1 flex-col'>
        <Header />
        <main className='mx-auto size-full max-w-360 flex-1 px-4 py-6 sm:px-6'>
          <Outlet />
        </main>
        <Toaster />
        <Footer />
      </SidebarInset>
    </div>
  )
}
