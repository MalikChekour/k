-- Cloudflare D1. AUCUNE donnee de sante : ni profil, ni traitement, ni raison de la commande.
CREATE TABLE IF NOT EXISTS entitlements (
  app_user_id TEXT NOT NULL,
  entitlement TEXT NOT NULL,
  expires_at  INTEGER,            -- ms epoch ; NULL = a vie
  updated_at  INTEGER NOT NULL,
  last_event  TEXT NOT NULL,
  PRIMARY KEY (app_user_id, entitlement)
);

CREATE TABLE IF NOT EXISTS orders (
  id         TEXT PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE, -- code de preparation unique, imprime sur le bon
  lines_json TEXT NOT NULL,        -- [{plantId, grams}]
  total_g    REAL NOT NULL,
  status     TEXT NOT NULL DEFAULT 'recue',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id   TEXT PRIMARY KEY,     -- idempotence : RevenueCat renvoie parfois deux fois
  received_at INTEGER NOT NULL
);
