import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/Layouts/sidebar'
import { Header } from '@/components/Layouts/header'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  let session = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getSession()
    session = data.session
  } catch (e) {
    return <pre style={{color:'red',padding:'2rem',whiteSpace:'pre-wrap'}}>{`layout error: ${e instanceof Error ? e.message+'\n'+e.stack : String(e)}`}</pre>
  }
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
