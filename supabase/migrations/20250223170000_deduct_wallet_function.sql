-- ════════════════════════════════════════════════════════════════════════════════
-- Atomic Wallet Deduction Function
-- Matches actual `wallets` schema: status (text), last_updated (timestamptz)
-- ════════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.deduct_wallet_balance(
  p_user_id UUID,
  p_amount DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance DECIMAL;
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_status = 'frozen' THEN
    RAISE EXCEPTION 'Wallet is frozen';
  END IF;

  UPDATE public.wallets
  SET balance = balance - p_amount,
      last_updated = NOW()
  WHERE user_id = p_user_id
    AND balance >= p_amount
    AND status != 'frozen'
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance or wallet not found';
  END IF;

  RETURN v_new_balance;
END;
$$;
