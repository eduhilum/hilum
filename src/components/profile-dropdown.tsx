import { Link } from '@tanstack/react-router'
import { User, LogOut } from 'lucide-react'
import useDialogState from '@/hooks/use-dialog-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { useOptionalAdminAuth } from '@/context/admin-auth-context'

export function ProfileDropdown() {
  const [open, setOpen] = useDialogState()
  const adminAuth = useOptionalAdminAuth()

  const user = adminAuth?.user
  const profile = adminAuth?.profile

  const displayName =
    profile?.full_name?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split('@')[0] ||
    'Administrator'

  const displayEmail = profile?.email || user?.email || ''
  const avatarUrl = profile?.avatar_url || ''

  const getInitials = (name: string, email: string) => {
    const cleanName = name.trim()
    if (cleanName && cleanName.toLowerCase() !== 'administrator') {
      const parts = cleanName.split(/\s+/)
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      }
      return cleanName.slice(0, 2).toUpperCase()
    }
    if (email) {
      return email.slice(0, 2).toUpperCase()
    }
    return 'AD'
  }

  const initials = getInitials(displayName, displayEmail)

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
            <Avatar className='h-8 w-8'>
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={displayName} />
              ) : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56' align='end' forceMount>
          <DropdownMenuLabel className='font-normal p-0'>
            <Link
              to='/settings'
              className='flex flex-col gap-1.5 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer transition-colors'
            >
              <p className='text-sm leading-none font-medium truncate'>
                {displayName}
              </p>
              {displayEmail ? (
                <p className='text-xs leading-none text-muted-foreground truncate'>
                  {displayEmail}
                </p>
              ) : null}
            </Link>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link
                to='/settings'
                className='flex items-center gap-2 cursor-pointer w-full'
              >
                <User className='size-4' />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant='destructive'
            className='cursor-pointer flex items-center gap-2'
            onClick={() => setOpen(true)}
          >
            <LogOut className='size-4' />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
