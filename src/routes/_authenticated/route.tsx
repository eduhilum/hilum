import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { useAdminAuth } from '@/context/admin-auth-context'
import { Button } from '@/components/ui/button'
import { ShieldAlert, LogOut, Loader2 } from 'lucide-react'

function ProtectedAdminLayout() {
  const { user, isAdmin, loading, signOut } = useAdminAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: '/sign-in', search: { redirect: window.location.pathname } })
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className='flex h-screen w-screen flex-col items-center justify-center gap-3 bg-background'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
        <p className='text-sm text-muted-foreground'>Verifying Hilum administrative credentials...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!isAdmin) {
    return (
      <div className='flex h-screen w-screen flex-col items-center justify-center p-4 bg-background'>
        <div className='max-w-md w-full rounded-2xl border p-8 text-center space-y-4 bg-card shadow-lg'>
          <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive'>
            <ShieldAlert className='h-7 w-7' />
          </div>
          <h2 className='text-2xl font-bold tracking-tight'>Access Restricted</h2>
          <p className='text-sm text-muted-foreground leading-relaxed'>
            You are currently signed in as <span className='font-semibold text-foreground'>{user.email}</span>, which does not have administrator privileges in Hilum.
          </p>
          <div className='rounded-lg bg-muted p-3 text-xs text-muted-foreground text-start'>
            To access this portal, your user profile role must be set to <code className='font-mono font-semibold text-foreground'>admin</code> in Supabase:
            <pre className='mt-1 p-2 bg-background rounded font-mono text-[11px] overflow-x-auto'>
              UPDATE public.user_profiles SET role = 'admin' WHERE email = '{user.email}';
            </pre>
          </div>
          <Button
            variant='outline'
            onClick={async () => {
              await signOut()
              navigate({ to: '/sign-in' })
            }}
            className='w-full gap-2'
          >
            <LogOut className='h-4 w-4' />
            Sign Out & Switch Account
          </Button>
        </div>
      </div>
    )
  }

  return <AuthenticatedLayout />
}

export const Route = createFileRoute('/_authenticated')({
  component: ProtectedAdminLayout,
})
