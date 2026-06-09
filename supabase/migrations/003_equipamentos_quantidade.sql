-- Adiciona rastreamento de quantidades próprias de equipamentos
-- quantidade_propria = 0 → não tenho este equipamento (apenas catálogo)
-- quantidade_propria > 0 → tenho N unidades em uso

ALTER TABLE impressoras
  ADD COLUMN IF NOT EXISTS quantidade_propria integer NOT NULL DEFAULT 0;

-- Índice para filtrar rapidamente "meus equipamentos"
CREATE INDEX IF NOT EXISTS idx_impressoras_proprios
  ON impressoras(quantidade_propria)
  WHERE quantidade_propria > 0;
