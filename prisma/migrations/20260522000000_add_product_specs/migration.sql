-- Añade columna `specs` (JSONB) en Product para guardar las specs estructuradas
-- extraídas de name+description por lib/specs/extractor.ts. Los productos
-- existentes arrancan con `{}` y un script de backfill las rellena después
-- (scripts/backfill-specs.ts).

ALTER TABLE "Product" ADD COLUMN "specs" JSONB NOT NULL DEFAULT '{}';

-- Índice GIN para acelerar futuros filtros tipo
--   WHERE specs @> '{"tech": "OLED"}'::jsonb
CREATE INDEX "Product_specs_idx" ON "Product" USING GIN ("specs");
