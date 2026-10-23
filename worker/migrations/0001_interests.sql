CREATE TABLE interests (
  request_id TEXT PRIMARY KEY NOT NULL,
  payload_hash TEXT NOT NULL,
  city TEXT NOT NULL CHECK (city IN ('Зеленоградск', 'Калининград', 'Светлогорск')),
  items_json TEXT NOT NULL CHECK (json_valid(items_json)),
  desired_date TEXT NOT NULL,
  delivery TEXT NOT NULL CHECK (delivery IN ('pickup', 'delivery', 'undecided')),
  price_consent INTEGER NOT NULL CHECK (price_consent = 1),
  value_total INTEGER NOT NULL CHECK (value_total >= 0),
  created_at INTEGER NOT NULL
);
CREATE INDEX interests_created_at ON interests(created_at);
CREATE INDEX interests_city_day ON interests(city, desired_date);

-- This table is transient. Raw IP addresses are never written here.
CREATE TABLE submission_tokens (
  request_id TEXT PRIMARY KEY NOT NULL,
  rate_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  slot INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 6),
  expires_at INTEGER NOT NULL,
  UNIQUE (rate_key, window_start, slot)
);
CREATE INDEX submission_tokens_expiry ON submission_tokens(expires_at);
