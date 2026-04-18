-- Advisor flagged public.set_updated_at as having a mutable search_path.
-- Lock it to the empty search_path so any references inside the function
-- resolve via fully-qualified names (which they don't — the function only
-- mutates NEW.updated_at). Explicit SET search_path also prevents a
-- privileged user from being tricked into running a hijacked function.

alter function public.set_updated_at() set search_path = '';
