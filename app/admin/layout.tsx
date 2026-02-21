import type { Metadata } from 'next'
import { AdminLayoutClient } from '@/components/admin/AdminLayoutClient'

export const metadata: Metadata = {
  title: {
    default: 'Admin',
    template: '%s | Admin',
  },
  manifest: '/api/admin/manifest',
  applicationName: 'BarberHub Admin',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
