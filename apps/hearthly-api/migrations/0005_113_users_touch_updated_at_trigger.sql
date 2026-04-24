-- Retrofit: attach touch_updated_at() trigger to the existing users table.
-- The function itself was created in 0004_113_create_households.sql. Without
-- this trigger, any UPDATE that forgets to set updated_at manually leaves
-- the column stale (the households and household_memberships tables gained
-- trigger-enforced updated_at in 0004; this closes the consistency gap).
CREATE TRIGGER users_touch_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
