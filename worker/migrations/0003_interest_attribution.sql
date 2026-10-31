-- Additive: old payload hashes and old Workers remain compatible.
CREATE TABLE IF NOT EXISTS interest_attribution (
  request_id TEXT PRIMARY KEY REFERENCES interests(request_id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('qr','telegram','partner','scenario')),
  partner_code TEXT CHECK (partner_code IS NULL OR (length(partner_code) = 4 AND partner_code GLOB 'p[0-9][0-9][0-9]' AND partner_code != 'p000')),
  CHECK (partner_code IS NULL OR channel IN ('qr','partner'))
);
