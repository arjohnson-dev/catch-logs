-- Fix delete_my_account(): direct deletes from storage.objects are not allowed.
-- Deleting auth.users will cascade to app tables; storage object cleanup should use Storage API.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  delete from auth.users
  where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
