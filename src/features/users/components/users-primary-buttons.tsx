export function UsersPrimaryButtons() {
  return (
    <div className='flex gap-2'>
      {/* 
        Invite/Add user buttons have been removed because 
        Supabase requires users to register through the auth system.
        If admin creation is needed later, an Edge Function with 
        service_role is required.
      */}
    </div>
  )
}
