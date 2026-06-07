// Tipos gerados automaticamente pelo Supabase CLI
// Para regenerar: npx supabase gen types typescript --local > src/lib/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          nome: string
          parent_id: string | null
          bling_id: string | null
          ordem: number
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          parent_id?: string | null
          bling_id?: string | null
          ordem?: number
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          parent_id?: string | null
          bling_id?: string | null
          ordem?: number
          created_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          id: string
          nome: string
          cnpj: string | null
          bling_id: string | null
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          cnpj?: string | null
          bling_id?: string | null
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          cnpj?: string | null
          bling_id?: string | null
          ativo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      cost_policies: {
        Row: {
          id: string
          nome: string
          metodo: 'LAST' | 'SIMPLE_AVG' | 'WEIGHTED_AVG'
          periodo_dias: number | null
          periodo_qtd_pedidos: number | null
          incluir_frete: boolean
          incluir_impostos: boolean
          scope: 'global' | 'category' | 'product'
          scope_id: string | null
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          metodo?: 'LAST' | 'SIMPLE_AVG' | 'WEIGHTED_AVG'
          periodo_dias?: number | null
          periodo_qtd_pedidos?: number | null
          incluir_frete?: boolean
          incluir_impostos?: boolean
          scope?: 'global' | 'category' | 'product'
          scope_id?: string | null
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          metodo?: 'LAST' | 'SIMPLE_AVG' | 'WEIGHTED_AVG'
          periodo_dias?: number | null
          periodo_qtd_pedidos?: number | null
          incluir_frete?: boolean
          incluir_impostos?: boolean
          scope?: 'global' | 'category' | 'product'
          scope_id?: string | null
          ativo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      pricing_policies: {
        Row: {
          id: string
          nome: string
          tecnica: 'MARKUP' | 'MARGIN'
          markup_pct: number | null
          margem_pct: number | null
          preco_minimo: number | null
          preco_maximo: number | null
          arredondamento: 'none' | 'psychological' | 'integer'
          scope: 'global' | 'category' | 'product'
          scope_id: string | null
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          tecnica?: 'MARKUP' | 'MARGIN'
          markup_pct?: number | null
          margem_pct?: number | null
          preco_minimo?: number | null
          preco_maximo?: number | null
          arredondamento?: 'none' | 'psychological' | 'integer'
          scope?: 'global' | 'category' | 'product'
          scope_id?: string | null
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          tecnica?: 'MARKUP' | 'MARGIN'
          markup_pct?: number | null
          margem_pct?: number | null
          preco_minimo?: number | null
          preco_maximo?: number | null
          arredondamento?: 'none' | 'psychological' | 'integer'
          scope?: 'global' | 'category' | 'product'
          scope_id?: string | null
          ativo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          sku: string
          nome: string
          unidade: string
          ncm: string | null
          categoria_id: string | null
          fornecedor_principal_id: string | null
          cost_policy_id: string | null
          pricing_policy_id: string | null
          bling_id: string | null
          fonte: 'local' | 'bling'
          custo_vigente: number | null
          preco_venda_vigente: number | null
          preco_minimo: number | null
          preco_bling: number | null
          sync_status_bling: 'synced' | 'pending' | 'divergent' | 'error' | 'not_connected'
          ativo: boolean
          ultima_revisao_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sku: string
          nome: string
          unidade?: string
          ncm?: string | null
          categoria_id?: string | null
          fornecedor_principal_id?: string | null
          cost_policy_id?: string | null
          pricing_policy_id?: string | null
          bling_id?: string | null
          fonte?: 'local' | 'bling'
          custo_vigente?: number | null
          preco_venda_vigente?: number | null
          preco_minimo?: number | null
          preco_bling?: number | null
          sync_status_bling?: 'synced' | 'pending' | 'divergent' | 'error' | 'not_connected'
          ativo?: boolean
          ultima_revisao_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sku?: string
          nome?: string
          unidade?: string
          ncm?: string | null
          categoria_id?: string | null
          fornecedor_principal_id?: string | null
          cost_policy_id?: string | null
          pricing_policy_id?: string | null
          bling_id?: string | null
          fonte?: 'local' | 'bling'
          custo_vigente?: number | null
          preco_venda_vigente?: number | null
          preco_minimo?: number | null
          preco_bling?: number | null
          sync_status_bling?: 'synced' | 'pending' | 'divergent' | 'error' | 'not_connected'
          ativo?: boolean
          ultima_revisao_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cost_components: {
        Row: {
          id: string
          nome: string
          tipo: 'PERCENT' | 'FIXED' | 'PER_UNIT'
          valor: number
          base: 'ON_COST' | 'ON_PRICE'
          obrigatorio: boolean
          ativo: boolean
          ordem: number
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          tipo: 'PERCENT' | 'FIXED' | 'PER_UNIT'
          valor: number
          base: 'ON_COST' | 'ON_PRICE'
          obrigatorio?: boolean
          ativo?: boolean
          ordem?: number
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          tipo?: 'PERCENT' | 'FIXED' | 'PER_UNIT'
          valor?: number
          base?: 'ON_COST' | 'ON_PRICE'
          obrigatorio?: boolean
          ativo?: boolean
          ordem?: number
          created_at?: string
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          id: string
          bling_pedido_id: string
          numero: string | null
          supplier_id: string | null
          data_pedido: string
          status: string
          total: number | null
          importado_em: string
        }
        Insert: {
          id?: string
          bling_pedido_id: string
          numero?: string | null
          supplier_id?: string | null
          data_pedido: string
          status: string
          total?: number | null
          importado_em?: string
        }
        Update: {
          id?: string
          bling_pedido_id?: string
          numero?: string | null
          supplier_id?: string | null
          data_pedido?: string
          status?: string
          total?: number | null
          importado_em?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          bling_produto_id: string | null
          sku: string | null
          descricao: string
          quantidade: number
          preco_unitario: number
          preco_total: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          bling_produto_id?: string | null
          sku?: string | null
          descricao: string
          quantidade: number
          preco_unitario: number
          preco_total: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          bling_produto_id?: string | null
          sku?: string | null
          descricao?: string
          quantidade?: number
          preco_unitario?: number
          preco_total?: number
        }
        Relationships: []
      }
      cost_snapshots: {
        Row: {
          id: string
          product_id: string
          cost_policy_id: string | null
          custo_base: number
          custo_total: number
          components_breakdown: Json
          metodo_usado: string
          pedidos_count: number
          pedidos_ids: string[] | null
          triggered_by: 'manual' | 'scheduler'
          triggered_by_user: string | null
          calculado_em: string
        }
        Insert: {
          id?: string
          product_id: string
          cost_policy_id?: string | null
          custo_base: number
          custo_total: number
          components_breakdown?: Json
          metodo_usado: string
          pedidos_count?: number
          pedidos_ids?: string[] | null
          triggered_by?: 'manual' | 'scheduler'
          triggered_by_user?: string | null
          calculado_em?: string
        }
        Update: {
          id?: string
          product_id?: string
          cost_policy_id?: string | null
          custo_base?: number
          custo_total?: number
          components_breakdown?: Json
          metodo_usado?: string
          pedidos_count?: number
          pedidos_ids?: string[] | null
          triggered_by?: 'manual' | 'scheduler'
          triggered_by_user?: string | null
          calculado_em?: string
        }
        Relationships: []
      }
      pricing_reviews: {
        Row: {
          id: string
          product_id: string
          snapshot_id: string
          pricing_policy_id: string | null
          custo_calculado: number
          preco_sugerido: number
          preco_minimo: number | null
          preco_anterior: number | null
          variacao_pct: number | null
          status: 'pending' | 'approved' | 'rejected' | 'expired'
          preco_aprovado: number | null
          aprovado_por: string | null
          aprovado_em: string | null
          motivo_rejeicao: string | null
          expira_em: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          snapshot_id: string
          pricing_policy_id?: string | null
          custo_calculado: number
          preco_sugerido: number
          preco_minimo?: number | null
          preco_anterior?: number | null
          variacao_pct?: number | null
          status?: 'pending' | 'approved' | 'rejected' | 'expired'
          preco_aprovado?: number | null
          aprovado_por?: string | null
          aprovado_em?: string | null
          motivo_rejeicao?: string | null
          expira_em?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          snapshot_id?: string
          pricing_policy_id?: string | null
          custo_calculado?: number
          preco_sugerido?: number
          preco_minimo?: number | null
          preco_anterior?: number | null
          variacao_pct?: number | null
          status?: 'pending' | 'approved' | 'rejected' | 'expired'
          preco_aprovado?: number | null
          aprovado_por?: string | null
          aprovado_em?: string | null
          motivo_rejeicao?: string | null
          expira_em?: string | null
          created_at?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          id: string
          product_id: string
          review_id: string | null
          preco_custo: number
          preco_venda: number
          margem_realizada_pct: number | null
          sincronizado_bling: boolean
          bling_sync_at: string | null
          origem: 'manual' | 'approved'
          alterado_por: string | null
          alterado_em: string
        }
        Insert: {
          id?: string
          product_id: string
          review_id?: string | null
          preco_custo: number
          preco_venda: number
          margem_realizada_pct?: number | null
          sincronizado_bling?: boolean
          bling_sync_at?: string | null
          origem: 'manual' | 'approved'
          alterado_por?: string | null
          alterado_em?: string
        }
        Update: never
        Relationships: []
      }
      integration_configs: {
        Row: {
          id: string
          provider: string
          active: boolean
          credentials_enc: Json
          sync_config: Json
          last_sync_at: string | null
          last_sync_status: 'success' | 'error' | 'partial' | null
          last_error: string | null
          token_expires_at: string | null
          connected_by: string
          connected_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider?: string
          active?: boolean
          credentials_enc?: Json
          sync_config?: Json
          last_sync_at?: string | null
          last_sync_status?: 'success' | 'error' | 'partial' | null
          last_error?: string | null
          token_expires_at?: string | null
          connected_by: string
          connected_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider?: string
          active?: boolean
          credentials_enc?: Json
          sync_config?: Json
          last_sync_at?: string | null
          last_sync_status?: 'success' | 'error' | 'partial' | null
          last_error?: string | null
          token_expires_at?: string | null
          connected_by?: string
          connected_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          id: string
          provider: string
          direction: 'inbound' | 'outbound'
          operation: string
          status: 'success' | 'error' | 'partial'
          records_ok: number | null
          records_failed: number | null
          error: string | null
          duration_ms: number | null
          triggered_by: 'scheduler' | 'manual' | null
          triggered_by_user: string | null
          executed_at: string
        }
        Insert: {
          id?: string
          provider?: string
          direction: 'inbound' | 'outbound'
          operation: string
          status: 'success' | 'error' | 'partial'
          records_ok?: number | null
          records_failed?: number | null
          error?: string | null
          duration_ms?: number | null
          triggered_by?: 'scheduler' | 'manual' | null
          triggered_by_user?: string | null
          executed_at?: string
        }
        Update: never
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          actor_type: string
          action: string
          resource_type: string | null
          resource_id: string | null
          old_value: Json | null
          new_value: Json | null
          ip_address: string | null
          occurred_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          actor_type?: string
          action: string
          resource_type?: string | null
          resource_id?: string | null
          old_value?: Json | null
          new_value?: Json | null
          ip_address?: string | null
          occurred_at?: string
        }
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
