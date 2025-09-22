import React, { useEffect, useMemo, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import { useAuth } from '../auth/AuthContext'

type EventRead = {
  id: number
  type: string
  title: string
  description?: string | null
  location?: string | null
  start_time: string
  end_time: string
  capacity?: number | null
  data?: Record<string, any> | null
  is_published: boolean
  created_by_user_id?: number | null
}

export default function EventsPage(){
  const { authFetch } = useAuth()
  const [events, setEvents] = useState<EventRead[]>([])
  const [types, setTypes] = useState<Record<string,string>>({})
  const [schemas, setSchemas] = useState<Record<string,any>>({})
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState<string>('')

  const load = async () => {
    setLoading(true)
    try{
      const [ev, t, s] = await Promise.all([
        authFetch('/events' + (filterType ? `?type=${encodeURIComponent(filterType)}` : '')).then(r=>r.json()),
        fetch('/events/types').then(r=>r.json()),
        fetch('/events/type_schemas').then(r=>r.json()),
      ])
      setEvents(ev)
      setTypes(t)
      setSchemas(s)
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ load() }, [filterType])

  const cols = useMemo(()=>[
    { field: 'id', width: 90 },
    { field: 'type' },
    { field: 'title' },
    { field: 'location' },
    { field: 'start_time' },
    { field: 'end_time' },
    { field: 'capacity' },
    { field: 'is_published', headerName: 'published' },
  ],[])

  return (
    <main style={{padding:16, display:'grid', gap:12}}>
      <h2>Events</h2>
      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        <label>Filter by type:</label>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)}>
          <option value="">(all)</option>
          {Object.keys(types).map(t=> <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
      </div>
      <div className="ag-theme-quartz" style={{height:420}}>
        <AgGridReact rowData={events} columnDefs={cols as any} suppressMenuHide />
      </div>
    </main>
  )
}

