export const dynamic = 'force-dynamic'

import { pgquery } from '@/lib/db/query'
import { PedidosClient } from './pedidos-client'

export default async function PedidosPage() {
  const [pedidos, totais] = await Promise.all([
    pgquery<{
      id: string
      bling_pedido_id: string
      numero: string | null
      supplier_nome: string | null
      data_pedido: string
      status: string
      total: string | null
      importado_em: string
      itens: string
    }>(`
      SELECT
        po.id,
        po.bling_pedido_id,
        po.numero,
        s.nome AS supplier_nome,
        po.data_pedido,
        po.status,
        po.total,
        po.importado_em,
        COUNT(poi.id)::text AS itens
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN purchase_order_items poi ON poi.order_id = po.id
      GROUP BY po.id, s.nome
      ORDER BY po.data_pedido DESC
      LIMIT 200
    `),
    pgquery<{ total_pedidos: string; total_itens: string; total_valor: string }>(`
      SELECT
        COUNT(DISTINCT po.id)::text AS total_pedidos,
        COUNT(poi.id)::text AS total_itens,
        COALESCE(SUM(po.total), 0)::text AS total_valor
      FROM purchase_orders po
      LEFT JOIN purchase_order_items poi ON poi.order_id = po.id
    `),
  ])

  return <PedidosClient pedidos={pedidos} totais={totais[0]} />
}
