import { NextResponse } from 'next/server'
import { getValidToken } from '@/lib/bling/tokens'
import { blingFetch } from '@/lib/bling/client'
import { pgquery, pgesc } from '@/lib/db/query'

interface BlingProduto {
  id: number
  nome: string
  codigo: string
  preco: number
  precoCusto: number | null
  tipo: string
  situacao: string
  unidade: string | null
}

export async function POST() {
  const token = await getValidToken()
  if (!token) {
    return NextResponse.json({ error: 'Bling não conectado' }, { status: 401 })
  }

  let pagina = 1
  let total = 0
  let importados = 0
  let hasMore = true

  try {
    while (hasMore) {
      const res = await blingFetch(`/produtos?pagina=${pagina}&limite=100&situacao=A`, token)

      if (res.status === 429) {
        // Rate limit — aguardar e tentar novamente
        await new Promise(r => setTimeout(r, 2000))
        continue
      }

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Bling API error ${res.status}: ${err}`)
      }

      const json = await res.json()
      const produtos: BlingProduto[] = json.data ?? []

      if (produtos.length === 0) {
        hasMore = false
        break
      }

      total += produtos.length

      // Upsert em lote — ON CONFLICT (bling_id)
      for (const p of produtos) {
        const blingId = String(p.id)
        const sku = p.codigo || blingId
        const preco = p.preco ?? null
        const custo = p.precoCusto ?? null

        await pgquery(`
          INSERT INTO products (bling_id, sku, nome, unidade, preco_bling, custo_vigente, fonte, ativo, sync_status_bling)
          VALUES (
            ${pgesc(blingId)},
            ${pgesc(sku)},
            ${pgesc(p.nome)},
            ${pgesc(p.unidade ?? 'UN')},
            ${pgesc(preco)},
            ${pgesc(custo)},
            'bling',
            TRUE,
            'synced'
          )
          ON CONFLICT (bling_id) DO UPDATE SET
            nome               = EXCLUDED.nome,
            sku                = EXCLUDED.sku,
            unidade            = EXCLUDED.unidade,
            preco_bling        = EXCLUDED.preco_bling,
            custo_vigente      = CASE
                                    WHEN products.custo_vigente IS NULL
                                    THEN EXCLUDED.custo_vigente
                                    ELSE products.custo_vigente
                                 END,
            sync_status_bling  = 'synced',
            updated_at         = now()
        `)
        importados++
      }

      // Bling retorna até 100 por página — se veio menos, acabou
      if (produtos.length < 100) {
        hasMore = false
      } else {
        pagina++
      }
    }

    return NextResponse.json({
      message: `${importados} produtos sincronizados com sucesso`,
      total,
      importados,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro na sincronização de produtos' },
      { status: 500 }
    )
  }
}
