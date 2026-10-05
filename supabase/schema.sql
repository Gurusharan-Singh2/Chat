-- ==============================================================================
-- SUPABASE DATABASE SETUP SCRIPT FOR REAL-TIME CHAT & WEBRTC CALLING APP
-- ==============================================================================
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor > New query).

-- 1. Create PROFILES table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 2. Create CONVERSATIONS table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid not null references public.profiles(id) on delete cascade,
  user2_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_different_users check (user1_id <> user2_id)
);

-- 3. Create MESSAGES table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz default null,
  file_url text default null,
  file_name text default null,
  file_type text default null,
  file_size bigint default null
);

-- Ensure columns exist if table was already created
alter table public.messages add column if not exists file_url text;
alter table public.messages add column if not exists file_name text;
alter table public.messages add column if not exists file_type text;
alter table public.messages add column if not exists file_size bigint;

-- ==============================================================================
-- PERFORMANCE INDEXES
-- ==============================================================================
create index if not exists idx_messages_conversation_date
  on public.messages (conversation_id, created_at asc);

create index if not exists idx_messages_unread
  on public.messages (conversation_id, read_at)
  where read_at is null;

create index if not exists idx_messages_sender
  on public.messages (sender_id);

create index if not exists idx_conversations_user1
  on public.conversations (user1_id);

create index if not exists idx_conversations_user2
  on public.conversations (user2_id);

create index if not exists idx_conversations_updated
  on public.conversations (updated_at desc);

create index if not exists idx_profiles_username
  on public.profiles (username);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- PROFILES Policies
-- Authenticated users can view all profiles (needed for search & participant details)
create policy "Authenticated users can view profiles"
  on public.profiles
  for select
  to authenticated
  using (true);

-- Users can insert their own profile
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- Users can update only their own profile
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- CONVERSATIONS Policies
-- Participants can view their conversations
create policy "Users can view their conversations"
  on public.conversations
  for select
  to authenticated
  using (auth.uid() = user1_id or auth.uid() = user2_id);

-- Authenticated users can create a conversation they participate in
create policy "Users can create conversations"
  on public.conversations
  for insert
  to authenticated
  with check (auth.uid() = user1_id or auth.uid() = user2_id);

-- Participants can update conversation metadata (e.g. updated_at timestamp)
create policy "Users can update their conversations"
  on public.conversations
  for update
  to authenticated
  using (auth.uid() = user1_id or auth.uid() = user2_id);

-- MESSAGES Policies
-- Participants can view messages in their conversations
create policy "Participants can view conversation messages"
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
    )
  );

-- Participants can send messages in their conversations
create policy "Participants can send messages"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
    )
  );

-- Conversation participants can update messages (to update read_at status)
create policy "Participants can update messages"
  on public.messages
  for update
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
    )
  );

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  desired_username text;
begin
  desired_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );

  -- Fallback if username already taken: append random suffix
  if exists (select 1 from public.profiles where username = desired_username) then
    desired_username := desired_username || '_' || substr(md5(random()::text), 1, 4);
  end if;

  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    desired_username,
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      'https://api.dicebear.com/7.x/bottts/svg?seed=' || desired_username
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- UPDATE CONVERSATION TIMESTAMP ON NEW MESSAGE TRIGGER
-- ==============================================================================
create or replace function public.handle_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute procedure public.handle_new_message();

-- ==============================================================================
-- HELPER RPC: GET OR CREATE CONVERSATION BETWEEN TWO USERS
-- ==============================================================================
create or replace function public.get_or_create_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv_id uuid;
  v_current_user uuid := auth.uid();
begin
  if v_current_user is null then
    raise exception 'Not authenticated';
  end if;

  if v_current_user = other_user_id then
    raise exception 'Cannot create a conversation with yourself';
  end if;

  -- Look for existing conversation regardless of user1/user2 order
  select id into v_conv_id
  from public.conversations
  where (user1_id = v_current_user and user2_id = other_user_id)
     or (user1_id = other_user_id and user2_id = v_current_user)
  limit 1;

  -- If not found, insert a new one
  if v_conv_id is null then
    insert into public.conversations (user1_id, user2_id)
    values (v_current_user, other_user_id)
    returning id into v_conv_id;
  end if;

  return v_conv_id;
end;
$$;

-- ==============================================================================
-- ENABLE SUPABASE REALTIME REPLICATION
-- ==============================================================================
-- Enable replica identity full so update payloads (like read_at) include all columns
alter table public.messages replica identity full;
alter table public.conversations replica identity full;
alter table public.profiles replica identity full;

-- Add tables to supabase_realtime publication
begin;
  -- Avoid error if table already added
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table
    public.messages,
    public.conversations,
    public.profiles;
commit;

-- ==============================================================================
-- STORAGE BUCKET FOR CHAT FILE ATTACHMENTS (1 GB FREE TIER)
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do nothing;

-- Storage policies: allow authenticated users to upload and view attachments
create policy "Authenticated users can upload attachments"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'chat-attachments');

create policy "Anyone can view chat attachments"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'chat-attachments');

