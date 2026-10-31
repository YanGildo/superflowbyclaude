-- Prospecção com motor próprio (Google Maps Scraper) + enriquecimento (e-mails, redes, sinais de anúncio).
alter table public.prospects
  add column linkedin        text,
  add column tiktok          text,
  add column youtube         text,
  add column x_profile       text,
  add column emails          text[] not null default '{}',   -- até 3, o do domínio do site primeiro
  add column email_host      text,                            -- google_workspace | microsoft_365 | other | none
  add column tech            jsonb,                           -- {fb_pixel, google_ads_tag, analytics, bing_ads, linkedin_insight, tiktok_pixel, cms, mobile_friendly}
  add column intent_score    int,                             -- 0–100: quanto já investe em marketing
  add column opening_hours   jsonb,
  add column price_range     text,
  add column source          text not null default 'apify',   -- apify | motor | csv | manual
  add column enriched_at     timestamptz,
  add column enrich_error    text;

create index prospects_intent_idx on public.prospects (workspace_id, intent_score desc nulls last);

alter table public.prospect_searches
  add column provider  text not null default 'apify',         -- apify | motor
  add column job_ids   text[] not null default '{}',          -- jobs do motor (um por cidade/quadrado)
  add column progress  jsonb;                                 -- {etapa, feitos, total}
