-- Sign in with Google (as in Babi Life): the Google account a boss is tied to; such a boss has no password.
ALTER TABLE users ADD COLUMN google_sub TEXT UNIQUE;
ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
