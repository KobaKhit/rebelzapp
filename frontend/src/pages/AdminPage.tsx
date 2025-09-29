import React, { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { usersApi, rolesApi, permissionsApi } from '../lib/api'
import Layout from '../components/Layout'

type Role = { id: number; name: string; description?: string | null; permissions: string[] }
type Permission = { id: number; name: string; description?: string | null }
type User = { id: number; email: string; full_name?: string | null; is_active: boolean; roles: string[] }

export default function AdminPage(){
  const { hasPermission } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>(
    hasPermission('manage_users') ? 'users' : 'roles'
  )
  
  // Form states
  const [newUser, setNewUser] = useState({ email: '', full_name: '', password: '' })
  const [newRole, setNewRole] = useState({ name: '', description: '' })
  const [newPermission, setNewPermission] = useState({ name: '', description: '' })
  
  // Delete user states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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
      
      const results = await Promise.all(promises)
      let resultIndex = 0
      
      if (hasPermission('manage_users')) {
        setUsers(results[resultIndex] as User[])
        resultIndex++
      }
      if (hasPermission('manage_roles')) {
        setRoles(results[resultIndex] as Role[])
        setPermissions(results[resultIndex + 1] as Permission[])
      }
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

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user)
    setShowDeleteModal(true)
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return
    
    setIsDeleting(true)
    try {
      await usersApi.deleteUser(userToDelete.id)
      setShowDeleteModal(false)
      setUserToDelete(null)
      await loadAll()
      alert('User deleted successfully!')
    } catch (error) {
      console.error('Failed to delete user:', error)
      alert('Failed to delete user')
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelDeleteUser = () => {
    setShowDeleteModal(false)
    setUserToDelete(null)
  }


  // Component for editing user roles
  const UserRoleEditor = ({ user, onUpdate }: { user: User; onUpdate: () => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles || []);

    const handleSave = async () => {
      try {
        await usersApi.setUserRoles(user.id, selectedRoles);
        setIsEditing(false);
        onUpdate(); // Refresh the data
      } catch (error) {
        console.error('Failed to update user roles:', error);
        alert('Failed to update user roles');
      }
    };

    const handleCancel = () => {
      setSelectedRoles(user.roles || []);
      setIsEditing(false);
    };

    if (isEditing) {
      return (
        <div className="flex flex-col gap-2 p-2 bg-gray-50 rounded">
          <div className="flex flex-wrap gap-2">
            {roles.map(role => (
              <label key={role.name} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.name)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRoles([...selectedRoles, role.name]);
                    } else {
                      setSelectedRoles(selectedRoles.filter(r => r !== role.name));
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm">{role.name}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {user.roles && user.roles.length > 0 ? (
            user.roles.map(role => (
              <span key={role} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {role}
              </span>
            ))
          ) : (
            <span className="text-gray-500 italic text-sm">No roles assigned</span>
          )}
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Edit user roles"
        >
          Edit
        </button>
      </div>
    );
  };


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
                
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Full Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Roles
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.full_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <UserRoleEditor user={user} onUpdate={loadAll} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                              title="Delete user"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                            No users found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Permissions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {roles.map((role) => (
                        <tr key={role.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {role.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {role.description || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="flex flex-wrap gap-1">
                              {role.permissions && role.permissions.length > 0 ? (
                                role.permissions.map(permission => (
                                  <span key={permission} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    {permission}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 italic">No permissions</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {roles.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                            No roles found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Permissions Table */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Permissions ({permissions.length})</h3>
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {permissions.map((permission) => (
                        <tr key={permission.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {permission.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {permission.description || '-'}
                          </td>
                        </tr>
                      ))}
                      {permissions.length === 0 && (
                        <tr>
                          <td colSpan={2} className="px-6 py-4 text-center text-sm text-gray-500">
                            No permissions found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
        </div>
        )}

        {/* Delete User Confirmation Modal */}
        {showDeleteModal && userToDelete && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900">Delete User</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete the user <strong>{userToDelete.email}</strong>?
                    {userToDelete.full_name && (
                      <span> ({userToDelete.full_name})</span>
                    )}
                  </p>
                  {userToDelete.roles && userToDelete.roles.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      Roles: {userToDelete.roles.join(', ')}
                    </p>
                  )}
                  <p className="text-sm text-red-600 mt-2">
                    This action cannot be undone. All associated data (messages, group memberships, etc.) will be affected.
                  </p>
                </div>
                <div className="items-center px-4 py-3">
                  <button
                    onClick={confirmDeleteUser}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-24 mr-2 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    onClick={cancelDeleteUser}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-24 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}

