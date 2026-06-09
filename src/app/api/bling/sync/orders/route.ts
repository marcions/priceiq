import { NextResponse } from 'next/server'
import { getValidToken } from '@/lib/bling/tokens'
import { blingFetch } from '@/lib/bling/client'
import { pgquery, pgqueryone, pgesc } from '@/lib/db/query'

interface BlingPedidoItem {
  produto: {
    id: number
    codigo: string
    descricao: string
  }
  quantidade: number
  valor: number
}

interface BlingPedido {
  id: number
  numero: string
  fornecedor?: { id: number; nome: string } | null
  data: string
  situacao?: { id: number; valor: string } | null
  totalProdutos: number
  itens?: BlingPedidoItem[]
}

export async function POST() {
  const token = await getValidToken()
  if (!token) {
    return NextResponse.json({ error: 'Bling não conectado' }, { status: 401 })
  }

  let pagina = 1
  let importados = 0
  let hasMore = true

  try {
    while (hasMore) {
      const res = await blingFetch(`/pedidos/compras?pagina=${pagina}&limite=100`, token)

      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 2000))
        continue
      }

      if (res.status === 404) {
        // Sem pedidos de compra
        hasMore = false
        break
      }

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Bling API error ${res.status}: ${err}`)
      }

      const json = await res.json()
      const pedidos: BlingPedido[] = json.data ?? []

      if (pedidos.length === 0) {
        hasMore = false
        break
      }

      for (const pedido of pedidos) {
        const blingPedidoId = String(pedido.id)
        const status = pedido.situacao?.valor ?? 'importado'

        // Resolver supplier_id pelo bling_id do fornecedor
        let supplierId: string | null = null
        if (pedido.fornecedor?.id) {
          const sup = await pgqueryone<{ id: string }>(`
            SELECT id FROM suppliers WHERE bling_id = ${pgesc(String(pedido.fornecedor.id))} LIMIT 1
          `)
          supplierId = sup?.id ?? null
        }

        // Upsert do pedido
        await pgquery(`
          INSERT INTO purchase_orders (bling_pedido_id, numero, supplier_id, data_pedido, status, total, importado_em)
          VALUES (
            ${pgesc(blingPedidoId)},
            ${pgesc(pedido.numero)},
            ${pgesc(supplierId)},
            ${pgesc(pedido.data)},
            ${pgesc(status)},
            ${pgesc(pedido.totalProdutos ?? 0)},
            now()
          )
          ON CONFLICT (bling_pedido_id) DO UPDATE SET
            status       = EXCLUDED.status,
            total        = EXCLUDED.total,
            supplier_id  = COALESCE(EXCLUDED.supplier_id, purchase_orders.supplier_id),
            importado_em = now()
        `)

        // Buscar o ID do pedido recém upsertado
        const ordem = await pgqueryone<{ id: string }>(`
          SELECT id FROM purchase_orders WHERE bling_pedido_id = ${pgesc(blingPedidoId)}
        `)

        if (!ordem) continue
        const orderId = ordem.id

        // Buscar detalhes do pedido para obter itens (API pode não retornar na listagem)
        const detailRes = await blingFetch(`/pedidos/compras/${pedido.id}`, token)
        if (detailRes.ok) {
          const detail = await detailRes.json()
          const itens: BlingPedidoItem[] = detail.data?.itens ?? pedido.itens ?? []

          // Apagar itens antigos e reinserir
          if (itens.length > 0) {
            await pgquery(`DELETE FROM purchase_order_items WHERE order_id = ${pgesc(orderId)}`)

            for (const item of itens) {
              const productId = item.produto?.id ? String(item.produto.id) : null
              const prod = productId
                ? await pgqueryone<{ id: string }>(`SELECT id FROM products WHERE bling_id = ${pgesc(productId)} LIMIT 1`)
                : null

              await pgquery(`
                INSERT INTO purchase_order_items
                  (order_id, product_id, bling_produto_id, sku, descricao, quantidade, preco_unitario, preco_total)
                VALUES (
                  ${pgesc(orderId)},
                  ${pgesc(prod?.id ?? null)},
                  ${pgesc(productId)},
                  ${pgesc(item.produto?.codigo ?? '')},
                  ${pgesc(item.produto?.descricao ?? '')},
                  ${pgesc(item.quantidade)},
                  ${pgesc(item.valor)},
                  ${pgesc((item.quantidade ?? 0) * (item.valor ?? 0))}
                )
              `)
            }
          }
        }

        importados++
      }

      if (pedidos.length < 100) {
        hasMore = false
      } else {
        pagina++
      }
    }

    return NextResponse.json({
      message: `${importados} pedidos de compra sincronizados`,
      importados,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro na sincronização de pedidos' },
      { status: 500 }
    )
  }
}
