-- Go agent: persist proposed (confirm-gated) writes so the in-chat widgets/cards
-- survive a reload. This is UI-only state — distinct from `tool_calls`, which
-- feeds the model replay. `pending_actions` is never sent back to the model.
alter table public.go_messages
  add column if not exists pending_actions jsonb;
