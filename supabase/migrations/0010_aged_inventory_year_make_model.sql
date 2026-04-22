-- Align aged_inventory with LightSpeed DMS exports, which provide
-- stock, year, make, model (not a single description string).
--
-- Keep description around for manual notes ("Demo unit", "Light scratch
-- on gas tank") — it's optional and not populated from the DMS feed.

alter table public.aged_inventory
  add column year int,
  add column make text,
  add column model_name text;

-- Index for future filters / reporting by make.
create index aged_inventory_store_make_idx
  on public.aged_inventory (store_id, make)
  where make is not null;
