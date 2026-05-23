-- Remove the orphaned budget_items table.
-- This was an older budget design (a separate per-trip budget ledger) that was
-- superseded by per-activity costs on scheduled_activities (budget_amount/
-- currency/paid/category) and per-day accommodation_cost_* on days. The Budget
-- DAL entity that targeted it was never called; the table was empty.

drop table if exists public.budget_items;
