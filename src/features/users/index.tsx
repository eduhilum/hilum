import { useEffect, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersProvider } from './components/users-provider'
import { UsersTable } from './components/users-table'
import { type User } from './data/schema'
import { supabase } from '@/lib/supabase'

const route = getRouteApi('/_authenticated/users/')

export function Users() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [usersData, setUsersData] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
      } else if (data) {
        // Map database records to the User schema
        const mappedUsers: User[] = data.map((profile) => ({
          id: profile.id,
          candidate_id: profile.candidate_id,
          full_name: profile.full_name || 'Unknown',
          email: profile.email || '',
          status: 'active', // Since 'status' is not natively in our user_profiles, default to active
          role: profile.role || 'candidate',
          is_pro_pass_active: !!profile.is_pro_pass_active,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        }))
        setUsersData(mappedUsers)
      }
      setLoading(false)
    }

    fetchUsers()
  }, [])

  return (
    <UsersProvider>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>User List</h2>
            <p className='text-muted-foreground'>
              Manage your candidates, faculty, and admins here.
            </p>
          </div>
          <UsersPrimaryButtons />
        </div>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">Loading users...</div>
        ) : (
          <UsersTable data={usersData} search={search} navigate={navigate} />
        )}
      </Main>

      <UsersDialogs />
    </UsersProvider>
  )
}
