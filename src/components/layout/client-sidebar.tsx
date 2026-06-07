'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Calculator,
  ClipboardList,
  RefreshCw,
  Settings,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

const navItems = [
  { label: 'Dashboard',    href: '/dashboard',       icon: LayoutDashboard },
  { label: 'Produtos',     href: '/produtos',         icon: Package },
  { label: 'Pedidos',      href: '/pedidos',          icon: ShoppingCart },
  { label: 'Custos',       href: '/custos',           icon: Calculator },
  { label: 'Precificação', href: '/precos',           icon: ClipboardList },
  { label: 'Sync Bling',   href: '/sync',             icon: RefreshCw },
  { label: 'Configurações',href: '/configuracoes',    icon: Settings },
]

export function ClientSidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 flex flex-col border-r bg-card">
      {/* Logo */}
      <div className="px-6 py-5 border-b">
        <span className="text-xl font-bold tracking-tight">
          Price<span className="text-primary">IQ</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t space-y-1">
        <div className="px-3 py-2">
          <p className="text-xs font-medium truncate">{user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
