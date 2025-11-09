-- Migration: add_users_clubs_foreign_key
-- Created at: 1762680267

ALTER TABLE users ADD CONSTRAINT users_club_id_fkey 
FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE SET NULL;;