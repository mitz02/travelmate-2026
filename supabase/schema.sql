-- Run this in your Supabase SQL Editor to create tables and storage.

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'rider' check (role in ('rider', 'driver', 'admin')),
  kyc_status text default 'pending' check (kyc_status in ('pending', 'verified', 'rejected')),
  rating numeric(3,2) default 0,
  total_ratings int default 0,
  trips_count int default 0,
  earnings_total numeric(12,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

create index if not exists profiles_user_id_idx on public.profiles(user_id);

-- Vehicles
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  make text not null,
  model text not null,
  year int not null,
  color text,
  plate text,
  capacity int not null default 4,
  is_primary boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists vehicles_user_id_idx on public.vehicles(user_id);

-- RLS (optional: use service role from backend to bypass)
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

create policy "Service role can do all"
  on public.profiles for all
  using (true)
  with check (true);

create policy "Users can read own vehicles"
  on public.vehicles for select
  using (auth.uid() = user_id);

create policy "Users can manage own vehicles"
  on public.vehicles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Storage bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar uploads"
  on storage.objects for insert
  with check (bucket_id = 'avatars');

create policy "Avatar public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Avatar update/delete"
  on storage.objects for update
  using (bucket_id = 'avatars');

create policy "Avatar delete"
  on storage.objects for delete
  using (bucket_id = 'avatars');

-- Trigger: create profile on signup (optional, backend also creates)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'fullName'),
    coalesce(new.raw_user_meta_data->>'role', 'rider')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
