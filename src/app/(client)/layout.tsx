import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/Layouts/sidebar'
import { Header } from '@/components/Layouts/header'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  // getSession() lê o JWT dos cookies localmente — sem chamada de rede
  // Evita falha de hairpin NAT no Docker ao chamar a própria URL pública
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="w-full bg-gray-2 dark:bg-[#020d1a]">
        <Header />
        <main className="isolate mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
          {children}
        </main>
      </div>
    </div>
  )
}
