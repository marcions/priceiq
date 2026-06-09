-- Migration 006: Adiciona 10 novas frentes de negócio
-- Corte CNC, Corte Laser, Resina/Epóxi, Serigrafia, Bordado,
-- Transfer Laser, Gráfica, Vestuário, Brindes, Serviços
-- Executada via script node em 2026-06-09
-- Totais pós-migração: 15 frentes | 200 componentes | 36 cost_policies | 70 pricing_policies

-- Este arquivo documenta o estado. Os dados já foram inseridos via script.
-- Para replicar do zero num ambiente limpo, executar scripts/insert-frentes.js
-- após 005_frentes_negocio.sql.

-- Verificação:
-- SELECT COUNT(*) FROM frentes_negocio;       -- 15
-- SELECT COUNT(*) FROM cost_components;        -- 200
-- SELECT COUNT(*) FROM cost_policies;          -- 36
-- SELECT COUNT(*) FROM pricing_policies;       -- 70
