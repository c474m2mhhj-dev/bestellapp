# Backend einrichten (Supabase)

Die App läuft als statische Single-File-Web-App (GitHub Pages). Ohne Backend
sieht jedes Gerät nur seinen eigenen Browser-Speicher (`localStorage`) –
Bestellungen erreichen die Küche dann nicht, Produkte/Punkte syncen nicht.

Mit einem kostenlosen **Supabase**-Projekt wird die App vollständig
geräteübergreifend: Bestellungen → Admin/Küche, Produkte, Ankündigungen,
Lieferslots, Accounts & Bestellpunkte synchronisieren in Echtzeit (Polling).

Die App spricht Supabase über die `Db`-Schnittstelle (`set/get/list/del`) an –
am restlichen Code ändert sich nichts.

---

## 1. Supabase-Projekt anlegen

1. Auf <https://supabase.com> kostenlos registrieren → **New project**.
2. Projektname + Datenbank-Passwort wählen, Region z.B. *Frankfurt*.
3. Warten, bis das Projekt bereit ist.

## 2. Tabelle + Zugriff anlegen

Im Supabase-Dashboard → **SQL Editor** → **New query** → folgendes ausführen:

```sql
-- Schlüssel-Wert-Tabelle (spiegelt die Db-Schnittstelle der App)
create table if not exists public.kv (
  key        text        not null,
  shared     boolean     not null default false,
  value      jsonb,
  updated_at timestamptz not null default now(),
  primary key (key, shared)
);

-- Row Level Security aktivieren
alter table public.kv enable row level security;

-- MVP: der öffentliche anon-Key darf lesen & schreiben.
-- (Die App vertraut aktuell dem Client – Admin-PIN ist clientseitig.
--  Für echten Produktivbetrieb später mit Supabase Auth + feineren
--  Policies absichern, siehe Sicherheitshinweis unten.)
create policy "anon full access" on public.kv
  for all to anon using (true) with check (true);

grant all on public.kv to anon;
```

## 3. Zugangsdaten in die App eintragen

Im Supabase-Dashboard → **Project Settings → API**:

- **Project URL** (z.B. `https://abcd1234.supabase.co`)
- **anon public** Key (langer JWT, beginnt mit `eyJ...`)

In [index.html](index.html) im `BACKEND`-Block oben eintragen:

```js
const BACKEND = {
  url: "https://abcd1234.supabase.co",
  key: "eyJhbGciOi...DEIN_ANON_KEY...",
};
```

Speichern, committen, auf GitHub Pages deployen – fertig. Die App nutzt ab
jetzt automatisch Supabase. Ist `url` leer, läuft sie wie bisher lokal weiter.

---

## Wie es funktioniert

- Eine einzige Tabelle `kv` dient als Schlüssel-Wert-Speicher.
- `shared = true` → globale Daten (Bestellungen `order_*`, Produkte,
  Ankündigung, Lieferslot, Tagesspecial, Accounts `user_*`).
- `shared = false` → projektweite, aber separat geführte Schlüssel.
- Die App pollt bereits regelmäßig (Bestellungen alle 5 s, Admin-Ansicht),
  daher ist kein Realtime-Setup nötig – funktioniert sofort über REST.

## Sicherheitshinweis

Der `anon`-Key ist **dafür gedacht**, im Client zu stehen – er ist nur so
mächtig wie die RLS-Policies erlauben. Die MVP-Policy oben erlaubt jedem mit
URL+anon-Key Lese-/Schreibzugriff auf die `kv`-Tabelle. Das entspricht dem
aktuellen Vertrauensmodell der App (clientseitiger Admin-PIN). Für echten
Produktivbetrieb empfohlen:

- Supabase **Auth** für echte Accounts statt clientseitiger Profile.
- Getrennte Tabellen + Policies (z.B. nur Eigentümer darf seinen `user_`-
  Datensatz schreiben; nur Personal darf Bestellstatus ändern).
- Den Admin-Bereich serverseitig absichern (statt PIN `1234`).
