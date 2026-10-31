-- Additive migration: original records and v1 retries remain valid.
CREATE TABLE IF NOT EXISTS interest_preferences (
  request_id TEXT PRIMARY KEY REFERENCES interests(request_id) ON DELETE CASCADE,
  occasion TEXT NOT NULL CHECK (occasion IN ('undecided','dinner','apartments','picnic','company','gift')),
  preferred_time TEXT NOT NULL CHECK (preferred_time IN ('undecided','morning','day','evening')),
  partner_type TEXT NOT NULL CHECK (partner_type IN ('none','apartments','bakery'))
);
