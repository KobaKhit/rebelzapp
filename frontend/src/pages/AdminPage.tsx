import React, { useEffect, useMemo, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { useAuth } from '../auth/AuthContext'

type Role = { id: number; name: string; description?: string | null; permissions: string[] }
type Permission = { id: number; name: string; description?: string | null }
type User = { id: number; email: string; full_name?: string | null; is_active: boolean; roles: string[] }

export default function AdminPage(){
  const { authFetch } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  const loadAll = async () => {
    setLoading(true)
    try{
      const [r,p,u] = await Promise.all([
        authFetch('/roles/').then(r=>r.json()),
        authFetch('/permissions/').then(r=>r.json()),
        authFetch('/users/').then(r=>r.json()),
      ])
      setRoles(r); setPermissions(p); setUsers(u)
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ loadAll() }, [])

  const roleCols = useMemo(()=>[
    { field: 'name' },
    { field: 'description' },
    { headerName: 'permissions', valueGetter: (p: any)=> (p.data.permissions||[]).join(', ') }
  ],[])

  const permCols = useMemo(()=>[
    { field: 'name' },
    { field: 'description' },
  ],[])

  const userCols = useMemo(()=>[
    { field: 'email' },
    { field: 'full_name', headerName: 'full name' },
    { field: 'is_active', headerName: 'active' },
    { headerName: 'roles', valueGetter: (p: any)=> (p.data.roles||[]).join(', ') }
  ],[])

  return (
    <main style={{padding:16, display:'grid', gap:16}}>
      <h2>Admin</h2>
      <div style={{display:'grid', gap:16}}>
        <div>
          <h3>Roles</h3>
          <div className="ag-theme-quartz" style={{height:260}}>
            <AgGridReact rowData={roles} columnDefs={roleCols as any} suppressMenuHide />
          </div>
        </div>
        <div>
          <h3>Permissions</h3>
          <div className="ag-theme-quartz" style={{height:260}}>
            <AgGridReact rowData={permissions} columnDefs={permCols as any} suppressMenuHide />
          </div>
        </div>
        <div>
          <h3>Users</h3>
          <div className="ag-theme-quartz" style={{height:260}}>
            <AgGridReact rowData={users} columnDefs={userCols as any} suppressMenuHide />
          </div>
        </div>
      </div>
      <button onClick={loadAll} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh'}</button>
    </main>
  )
}

