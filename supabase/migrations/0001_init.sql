create table if not exists change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  raw_input text,
  source_channel text,
  registrant_name text,
  registrant_name_source text,
  registrant_name_confidence numeric,
  registrant_name_review_status text default 'unreviewed',
  field_changed text,
  field_changed_source text,
  field_changed_confidence numeric,
  field_changed_review_status text default 'unreviewed',
  old_value text,
  new_value text,
  new_value_source text,
  new_value_confidence numeric,
  new_value_review_status text default 'unreviewed',
  requester_email text,
  sheet_row_id text,
  status text default 'pending',
  colour_code text default 'yellow',
  created_at timestamptz not null default now()
);

alter table change_requests enable row level security;
drop policy if exists "change_requests_v1_read" on change_requests;
create policy "change_requests_v1_read" on change_requests for select using (true);
drop policy if exists "change_requests_v1_write" on change_requests;
create policy "change_requests_v1_write" on change_requests for all using (true) with check (true);

create table if not exists acknowledgements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  change_request_id uuid references change_requests(id),
  sent_to text,
  body text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table acknowledgements enable row level security;
drop policy if exists "acknowledgements_v1_read" on acknowledgements;
create policy "acknowledgements_v1_read" on acknowledgements for select using (true);
drop policy if exists "acknowledgements_v1_write" on acknowledgements;
create policy "acknowledgements_v1_write" on acknowledgements for all using (true) with check (true);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  change_request_id uuid,
  action text,
  actor_label text,
  old_status text,
  new_status text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table audit_logs enable row level security;
drop policy if exists "audit_logs_v1_read" on audit_logs;
create policy "audit_logs_v1_read" on audit_logs for select using (true);
drop policy if exists "audit_logs_v1_write" on audit_logs;
create policy "audit_logs_v1_write" on audit_logs for all using (true) with check (true);

insert into change_requests (id, raw_input, source_channel, registrant_name, registrant_name_source, registrant_name_confidence, registrant_name_review_status, field_changed, field_changed_source, field_changed_confidence, field_changed_review_status, old_value, new_value, new_value_source, new_value_confidence, new_value_review_status, requester_email, sheet_row_id, status, colour_code)
values
  (gen_random_uuid(), 'Hi can John Doe please be moved from the 9am slot to 2pm on Friday?', 'whatsapp', 'John Doe', 'ai', 0.93, 'unreviewed', 'session_time', 'ai', 0.91, 'unreviewed', '9am Friday', '2pm Friday', 'ai', 0.91, 'unreviewed', 'john.doe@example.com', 'row_12', 'pending', 'yellow'),
  (gen_random_uuid(), 'Please update Sarah Lee dietary requirement to vegan.', 'email', 'Sarah Lee', 'ai', 0.97, 'reviewed', 'dietary_requirement', 'ai', 0.95, 'reviewed', 'vegetarian', 'vegan', 'ai', 0.95, 'reviewed', 'sarah.lee@example.com', 'row_7', 'confirmed', 'green'),
  (gen_random_uuid(), 'Marcus Tan wants to cancel his registration entirely.', 'whatsapp', 'Marcus Tan', 'ai', 0.88, 'reviewed', 'registration_status', 'ai', 0.85, 'reviewed', 'registered', 'cancelled', 'ai', 0.85, 'reviewed', 'marcus.tan@example.com', 'row_19', 'rejected', 'red'),
  (gen_random_uuid(), 'Can you change Priya Mehta table number from 5 to 8 please', 'whatsapp', 'Priya Mehta', 'ai', 0.72, 'unreviewed', 'table_number', 'ai', 0.70, 'unreviewed', '5', '8', 'ai', 0.70, 'unreviewed', 'priya.mehta@example.com', 'row_23', 'pending', 'yellow');

insert into audit_logs (change_request_id, action, actor_label, old_status, new_status, metadata)
select id, 'created', 'system', null, 'pending', '{"source": "seed"}'::jsonb from change_requests where status = 'pending';

insert into audit_logs (change_request_id, action, actor_label, old_status, new_status, metadata)
select id, 'confirmed', 'demo_user', 'pending', 'confirmed', '{"sheet_updated": true}'::jsonb from change_requests where status = 'confirmed';

insert into audit_logs (change_request_id, action, actor_label, old_status, new_status, metadata)
select id, 'rejected', 'demo_user', 'pending', 'rejected', '{"sheet_updated": true}'::jsonb from change_requests where status = 'rejected';