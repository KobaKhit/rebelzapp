import React, { useEffect, useMemo, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { useAuth } from '../lib/auth'
import { usersApi, rolesApi, permissionsApi } from '../lib/api'
import Layout from '../components/Layout'

type Role = { id: number; name: string; description?: string | null; permissions: string[] }
type Permission = { id: number; name: string; description?: string | null }
type User = { id: number; email: string; full_name?: string | null; is_active: boolean; roles: string[] }

export default function AdminPage(){
  const { authFetch, hasPermission } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users')
  
  // Form states
  const [newUser, setNewUser] = useState({ email: '', full_name: '', password: '' })
  const [newRole, setNewRole] = useState({ name: '', description: '' })
  const [newPermission, setNewPermission] = useState({ name: '', description: '' })

  const loadAll = async () => {
    setLoading(true)
    try{
      const promises = []
      if (hasPermission('manage_users')) {
        promises.push(usersApi.getUsers())
      } else {
        promises.push(Promise.resolve([]))
      }
      if (hasPermission('manage_roles')) {
        promises.push(rolesApi.getRoles())
        promises.push(permissionsApi.getPermissions())
      } else {
        promises.push(Promise.resolve([]))
        promises.push(Promise.resolve([]))
      }
      
      const [u, r, p] = await Promise.all(promises)
      setUsers(u); setRoles(r); setPermissions(p)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ loadAll() }, [])

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUser.email || !newUser.password) return
    
    // Validate password length
    if (newUser.password.length < 8) {
      alert('Password must be at least 8 characters long')
      return
    }
    
    try {
      console.log('Creating user with data:', newUser)
      await usersApi.createUser(newUser)
      setNewUser({ email: '', full_name: '', password: '' })
      await loadAll()
      alert('User created successfully!')
    } catch (error: any) {
      console.error('Failed to create user:', error)
      
      // Show detailed error message
      let errorMessage = 'Failed to create user'
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // Pydantic validation errors
          const errors = error.response.data.detail.map((err: any) => 
            `${err.loc.join('.')}: ${err.msg}`
          ).join(', ')
          errorMessage = `Validation error: ${errors}`
        } else {
          errorMessage = error.response.data.detail
        }
      }
      alert(errorMessage)
    }
  }

  const createRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRole.name) return
    
    try {
      await rolesApi.createRole(newRole)
      setNewRole({ name: '', description: '' })
      await loadAll()
      alert('Role created successfully!')
    } catch (error) {
      console.error('Failed to create role:', error)
      alert('Failed to create role')
    }
  }

  const createPermission = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPermission.name) return
    
    try {
      await permissionsApi.createPermission(newPermission)
      setNewPermission({ name: '', description: '' })
      await loadAll()
      alert('Permission created successfully!')
    } catch (error) {
      console.error('Failed to create permission:', error)
      alert('Failed to create permission')
    }
  }

  const userCols = useMemo(()=>[
    { field: 'email', headerName: 'Email' },
    { field: 'full_name', headerName: 'Full Name' },
    { field: 'is_active', headerName: 'Active' },
    { headerName: 'Roles', valueGetter: (p: any)=> (p.data.roles||[]).join(', ') }
  ],[])

  const roleCols = useMemo(()=>[
    { field: 'name', headerName: 'Name' },
    { field: 'description', headerName: 'Description' },
    { headerName: 'Permissions', valueGetter: (p: any)=> (p.data.permissions||[]).join(', ') }
  ],[])

  const permCols = useMemo(()=>[
    { field: 'name', headerName: 'Name' },
    { field: 'description', headerName: 'Description' },
  ],[])

  return (
    <Layout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Administration</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage users, roles, and permissions for your organization.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {hasPermission('manage_users') && (
                <button
                  onClick={() => setActiveTab('users')}
                  className={`${
                    activeTab === 'users'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  Users
                </button>
              )}
              {hasPermission('manage_roles') && (
                <button
                  onClick={() => setActiveTab('roles')}
                  className={`${
                    activeTab === 'roles'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                  Roles & Permissions
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && hasPermission('manage_users') && (
          <div className="mt-6 space-y-6">
            {/* Create User Form */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New User</h3>
                <form onSubmit={createUser} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <input
                    type="email"
                    placeholder="Email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <input
                    type="password"
                    placeholder="Password (min 8 characters)"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    minLength={8}
                    required
                  />
                  <button
                    type="submit"
                    className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Create User
                  </button>
                </form>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Users ({users.length})</h3>
                  <button
                    onClick={loadAll}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {loading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
                <div className="ag-theme-quartz" style={{height: 400}}>
                  <AgGridReact rowData={users} columnDefs={userCols as any} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Roles & Permissions Tab */}
        {activeTab === 'roles' && hasPermission('manage_roles') && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Create Role */}
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Role</h3>
                  <form onSubmit={createRole} className="space-y-4">
                    <input
                      type="text"
                      placeholder="Role Name"
                      value={newRole.name}
                      onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={newRole.description}
                      onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <button
                      type="submit"
                      className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      Create Role
                    </button>
                  </form>
                </div>
              </div>

              {/* Create Permission */}
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Permission</h3>
                  <form onSubmit={createPermission} className="space-y-4">
                    <input
                      type="text"
                      placeholder="Permission Name"
                      value={newPermission.name}
                      onChange={(e) => setNewPermission({...newPermission, name: e.target.value})}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={newPermission.description}
                      onChange={(e) => setNewPermission({...newPermission, description: e.target.value})}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <button
                      type="submit"
                      className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      Create Permission
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Roles Table */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Roles ({roles.length})</h3>
                <div className="ag-theme-quartz" style={{height: 300}}>
                  <AgGridReact rowData={roles} columnDefs={roleCols as any} />
                </div>
              </div>
            </div>

            {/* Permissions Table */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Permissions ({permissions.length})</h3>
                <div className="ag-theme-quartz" style={{height: 300}}>
                  <AgGridReact rowData={permissions} columnDefs={permCols as any} />
                </div>
              </div>
          </div>
        </div>
        )}
      </div>
    </Layout>
  )
}

