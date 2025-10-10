/*
  # Fix user foreign key references

  1. Changes
    - Drop foreign key constraints on workflows and templates that reference public.users
    - Create new foreign key constraints that reference auth.users instead
    - Drop the redundant public.users table (user_profiles already references auth.users)
  
  2. Security
    - No changes to RLS policies needed
*/

-- Drop existing foreign key constraints
ALTER TABLE workflows 
  DROP CONSTRAINT IF EXISTS workflows_user_id_fkey;

ALTER TABLE templates 
  DROP CONSTRAINT IF EXISTS templates_created_by_fkey;

-- Create new foreign key constraints pointing to auth.users
ALTER TABLE workflows 
  ADD CONSTRAINT workflows_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE templates 
  ADD CONSTRAINT templates_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- Drop the redundant public.users table
DROP TABLE IF EXISTS public.users CASCADE;
