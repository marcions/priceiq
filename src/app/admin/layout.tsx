import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Verifica role admin via user_metadata
  if (user.user_metadata?.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 border-r bg-card px-4 py-6">
        <div className="mb-8">
          <span className="text-xl font-bold">
            Price<span className="text-primary">IQ</span>
            <span className="ml-2 text-xs text-muted-foreground font-normal">Admin</span>
          </span>
        </div>
        <nav className="space-y-1">
          {[
            { label: 'Dashboard', href: '/admin/dashboard' },
            { label: 'Clientes', href: '/admin/clientes' },
            { label: 'Planos', href: '/admin/planos' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto bg-muted/10 p-6">
        {children}
      </main>
    </div>
  )
}
