
-- Make profile/worker record creation depend on email verification.
-- Drop any insert-time triggers and re-create as an email-confirmation trigger.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;

-- Fire handle_new_user only when:
--  (a) a new user is inserted AND their email is already confirmed (OAuth/social), OR
--  (b) an existing user's email_confirmed_at transitions from NULL to a value.
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
WHEN (NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_email_confirmed
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.handle_new_user();
