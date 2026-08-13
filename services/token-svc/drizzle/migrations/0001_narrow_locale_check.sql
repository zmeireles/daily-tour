-- Narrow the guest/reservation locale CHECK from six locales to the four the
-- app can actually serve.
--
-- Closes the token-svc half of #383. The PWA imports exactly en, pt-PT, fr and
-- es into its i18n `resources`; a reservation created with 'pt-BR' or 'de'
-- produced a guest whose UI was entirely English, silently, because it looked
-- like a language preference rather than a failure. Accepting a locale the
-- frontend cannot honour is the root of that surprise.
--
-- The new list is derived from the CURRENT live constraint, read out of
-- pg_constraint on the running database, not reconstructed from 0000_init.sql.
-- A CHECK is widened by later migrations, and rebuilding one from the migration
-- where the table was born is how a previously-permitted value gets silently
-- dropped.
--
-- Safe on existing data, verified against qual immediately before writing this
-- (both tables, all rows): pt-PT 4, en 2, es 1, fr 1 — zero rows in 'pt-BR' or
-- 'de'. ADD CONSTRAINT validates existing rows, so a single stray row would
-- fail the migration loudly rather than corrupt anything.
--
-- If a sixth locale is ever needed, widen this list AND add the bundle to
-- apps/pwa/src/lib/i18n/index.ts. The two must move together — that they could
-- drift apart is the whole of #383.

ALTER TABLE auth_tokens.guest
  DROP CONSTRAINT IF EXISTS guest_locale_check;
--> statement-breakpoint
ALTER TABLE auth_tokens.guest
  ADD CONSTRAINT guest_locale_check
  CHECK (locale IN ('en', 'pt-PT', 'es', 'fr'));
--> statement-breakpoint
ALTER TABLE auth_tokens.reservation
  DROP CONSTRAINT IF EXISTS reservation_locale_check;
--> statement-breakpoint
ALTER TABLE auth_tokens.reservation
  ADD CONSTRAINT reservation_locale_check
  CHECK (locale IN ('en', 'pt-PT', 'es', 'fr'));
