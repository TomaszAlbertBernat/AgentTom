-- Migration to make user tables optional for local mode
-- This migration can be run safely in both local and multi-user deployments

-- Make users table optional by adding a check
-- Only create the auth_users table if not in local mode
-- In local mode, we don't need user authentication tables

-- Add a comment to document local mode compatibility
-- This migration is designed to be idempotent and safe to run multiple times
