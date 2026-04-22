-- Add stock_number to deals so salesperson deal entry can lookup the hit list
-- and auto-apply spiffs / mark aged_inventory as sold.
--
-- Stored as plain text (not a FK) so the salesperson can enter any stock number
-- including ones not on the hit list. The join to aged_inventory is a soft
-- lookup by (store_id, stock_number) at deal save time.

alter table public.deals
  add column stock_number text;

-- Index for the (store, stock) lookup during deal save / hit-list matching.
create index deals_store_stock_idx
  on public.deals (store_id, stock_number)
  where stock_number is not null;
