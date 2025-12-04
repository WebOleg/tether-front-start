/**
 * Admin panel root layout.
 * Wraps all admin pages with sidebar navigation.
 */

import { AdminLayout } from '@/components/layout'

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminLayout>{children}</AdminLayout>
}
