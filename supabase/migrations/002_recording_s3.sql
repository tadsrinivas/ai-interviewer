-- Migration: Track S3 recording location
-- Run in Supabase SQL Editor

-- The S3 key (e.g., "tavus/conv_id/timestamp.mp4")
-- We keep this separate from recording_url because S3 URLs aren't directly playable
alter table public.interviews
add column if not exists recording_s3_bucket text;

alter table public.interviews
add column if not exists recording_s3_key text;

alter table public.interviews
add column if not exists recording_duration_seconds int;
