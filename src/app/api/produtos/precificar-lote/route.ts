import { NextResponse } from 'next/server'
import { precificarLote } from '@/lib/precificacao/calcular'

// Usa precificarPorFrente para cada produto — sem metodo/parametro manual.
// Cada produto aplica a pricing_policy da sua frente automaticamente.
export async function POST() {
  const result = await precificarLote()
  return NextResponse.json(result)
}
