-- Migration: Add recording_url column to interviews table
-- Run this in Supabase SQL Editor

alter table public.interviews
add column if not exists recording_url text;
