'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ClipboardList,
  RefreshCw,
  Settings,
  LogOut,
  Tag,
  Truck,
  ChevronRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

type NavChild = { label: string; href: string }
type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavChild[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard },
  { label: 'Produtos',     href: '/produtos',     icon: Package },
  { label: 'Categorias',   href: '/categorias',   icon: Tag },
  { label: 'Fornecedores', href: '/fornecedores', icon: Truck },
  { label: 'Pedidos',      href: '/pedidos',      icon: ShoppingCart },
  { label: 'Precificação', href: '/precos',       icon: ClipboardList },
  { label: 'Sync Bling',   href: '/sync',         icon: RefreshCw },
  {
    label: 'Configurações',
    href: '/configuracoes',
    icon: Settings,
    children: [
      { label: 'Políticas de Custo', href: '/configuracoes/custo' },
      { label: 'Políticas de Preço', href: '/configuracoes/precificacao' },
    ],
  },
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
          const childActive = item.children?.some(
            (c) => pathname === c.href || pathname.startsWith(c.href + '/')
          ) ?? false

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  active || childActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
                {item.children && (
                  <ChevronRight className="h-3 w-3 ml-auto" />
                )}
              </Link>

              {item.children && (active || childActive) && (
                <div className="ml-7 mt-1 space-y-1">
                  {item.children.map((child) => {
                    const childIsActive =
                      pathname === child.href || pathname.startsWith(child.href + '/')
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                          childIsActive
                            ? 'bg-primary/80 text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
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
