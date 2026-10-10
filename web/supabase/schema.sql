-- Supabase Schema for TrustHire

create table nonces (
  address text primary key,
  message text not null,
  expires_at timestamptz not null
);

create table briefs (
  job_id bigint primary key,
  client text not null,
  brief_enc text not null,
  public_summary text not null
);

create table applications (
  job_id bigint not null,
  applicant text not null,
  pitch_enc text not null,
  skills text[] not null,
  match_score int,
  match_detail jsonb,
  provider text,
  created_at timestamptz default now(),
  primary key (job_id, applicant)
);

create table deliverables (
  job_id bigint primary key,
  freelancer text not null,
  content_enc text not null,
  hash text not null
);

create table verdicts (
  job_id bigint primary key,
  provider text not null,
  confidence_bps int not null,
  pass boolean not null
);

-- Turn Row Level Security ON for all tables with NO public policies (service-role key only)
alter table nonces enable row level security;
alter table briefs enable row level security;
alter table applications enable row level security;
alter table deliverables enable row level security;
alter table verdicts enable row level security;
