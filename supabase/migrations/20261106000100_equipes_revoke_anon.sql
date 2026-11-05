-- Funções de equipe: só para quem está logado (anon não chama nada além da prévia do convite).
do $$
declare f text;
begin
  foreach f in array array[
    'accept_invite(text)', 'can_view_activity(uuid, text, text, uuid)', 'create_invite(uuid, text, public.member_role, jsonb)',
    'create_team(text)', 'current_actor_name()', 'is_manager(uuid)', 'member_access(uuid, uuid)', 'member_level(uuid, text)',
    'move_to_workspace(text, uuid, uuid)', 'my_access(uuid)', 'my_resource_level(text, uuid)', 'remove_member(uuid, uuid)',
    'resource_access(text, uuid)', 'resource_level(text, uuid, uuid)', 'set_member_access(uuid, uuid, public.member_role, jsonb)',
    'set_resource_grant(text, uuid, uuid, text)', 'set_resource_restricted(text, uuid, boolean)', 'task_level(uuid, uuid, uuid)',
    'task_step_level(uuid, uuid)', 'team_members(uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  revoke execute on function public.proposals_on_approve() from public, anon, authenticated;
end $$;
