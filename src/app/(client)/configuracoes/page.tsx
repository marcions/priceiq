import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calculator, TrendingUp } from 'lucide-react'

const sections = [
  {
    href: '/configuracoes/custo',
    icon: Calculator,
    title: 'Políticas de Custo',
    description: 'Configure como o custo dos produtos é calculado: último preço, média simples ou média ponderada.',
  },
  {
    href: '/configuracoes/precificacao',
    icon: TrendingUp,
    title: 'Políticas de Precificação',
    description: 'Defina as regras de markup ou margem para sugestão automática de preços.',
  },
]

export default function ConfiguracoesPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm">Gerencie as políticas e regras do sistema</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="rounded-lg bg-primary/10 p-2">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{s.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
