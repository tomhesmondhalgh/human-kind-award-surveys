-- payment_history.amount is in pounds for card payments, but invoice requests
-- stored the plan price in pence. The admin screens guessed which by size
-- (anything over 10,000 was treated as pence). Store pounds everywhere:
-- update-invoice-status now writes pounds, and existing invoice rows are
-- converted using the same rule the screens used, so displayed amounts don't
-- change.
UPDATE public.payment_history
SET amount = amount / 100
WHERE payment_method = 'invoice'
  AND amount > 10000;

COMMENT ON COLUMN public.payment_history.amount IS 'Amount in major currency units (pounds), not pence.';
