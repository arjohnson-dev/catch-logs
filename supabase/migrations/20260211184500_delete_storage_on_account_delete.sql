-- Ensure account deletion also removes user-owned catch photo objects.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  uid text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  uid := auth.uid()::text;

  delete from storage.objects
  where bucket_id = 'catch-photos'
    and (storage.foldername(name))[1] = uid;

  delete from auth.users
  where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
