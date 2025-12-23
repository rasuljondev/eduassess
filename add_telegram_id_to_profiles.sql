-- Add telegram_id field to profiles table for admin/superadmin Telegram integration
-- This allows admins to be identified and greeted in the Telegram bot

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telegram_id bigint UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id ON public.profiles(telegram_id);

COMMENT ON COLUMN public.profiles.telegram_id IS 'Optional Telegram user ID for admin/superadmin bot integration';

