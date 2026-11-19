-- Babiland Boss online: players, their saved game, the districts each real player holds, the duels between
-- them, the boss's share of his workers' sales, and the shop (paid in F CFA through GeniusPay or by card).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  name_key     TEXT NOT NULL UNIQUE,           -- lower case, to find a name whatever its case
  password     TEXT NOT NULL,                  -- bcrypt
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  seen_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  tester       BOOLEAN NOT NULL DEFAULT false, -- may buy with the payment services' test keys
  -- what only the server keeps: diamonds (bought), the Pass Boss, the x2 boost
  diamonds     INTEGER NOT NULL DEFAULT 0 CHECK (diamonds >= 0),
  pass_until   TIMESTAMPTZ,
  boost_until  TIMESTAMPTZ,
  -- the boss's share of what his workers sold, waiting to be picked up
  tribute      BIGINT NOT NULL DEFAULT 0,
  fame         INTEGER NOT NULL DEFAULT 0,     -- for the ranking (the phone says it, capped)
  save         JSONB,                          -- the rest of the game, as the phone keeps it
  save_at      TIMESTAMPTZ
);

-- Who holds each district of each place: a real player (no row: the computer's boss).
CREATE TABLE districts (
  place        TEXT NOT NULL,
  idx          INTEGER NOT NULL,
  owner        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  since        TIMESTAMPTZ NOT NULL DEFAULT now(),
  shield_until TIMESTAMPTZ,
  guards       INTEGER NOT NULL DEFAULT 0 CHECK (guards BETWEEN 0 AND 3),
  PRIMARY KEY (place, idx)
);
CREATE INDEX districts_owner ON districts (owner);

-- A duel: someone attacks a district (its owner, a player, may defend it live).
CREATE TABLE duels (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place        TEXT NOT NULL,
  idx          INTEGER NOT NULL,
  attacker     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  defender     UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at      TIMESTAMPTZ NOT NULL,
  attack       INTEGER NOT NULL DEFAULT 0,
  defence      INTEGER NOT NULL DEFAULT 0,
  result       TEXT                             -- 'won', 'lost', null while it goes on
);
CREATE INDEX duels_open ON duels (place, idx) WHERE result IS NULL;

CREATE TABLE purchases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item         TEXT NOT NULL,
  price        INTEGER NOT NULL,
  diamonds     INTEGER NOT NULL DEFAULT 0,
  method       TEXT NOT NULL,                   -- 'mobile' (GeniusPay) or 'carte' (Stripe)
  ref          TEXT,                            -- the payment service's reference
  status       TEXT NOT NULL DEFAULT 'created',
  sandbox      BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  credited_at  TIMESTAMPTZ
);
CREATE INDEX purchases_user ON purchases (user_id, created_at DESC);
