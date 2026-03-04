-- Passkey credentials table
CREATE TABLE public.passkey_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] DEFAULT '{}',
  device_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_passkey_credentials_user_id ON public.passkey_credentials(user_id);
CREATE INDEX idx_passkey_credentials_credential_id ON public.passkey_credentials(credential_id);

ALTER TABLE public.passkey_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own passkeys"
  ON public.passkey_credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own passkeys"
  ON public.passkey_credentials FOR DELETE
  USING (auth.uid() = user_id);

-- Passkey challenges table (accessed only via admin/service role client)
CREATE TABLE public.passkey_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_passkey_challenges_challenge ON public.passkey_challenges(challenge);

ALTER TABLE public.passkey_challenges ENABLE ROW LEVEL SECURITY;
