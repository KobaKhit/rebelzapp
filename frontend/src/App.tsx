import React from 'react'
import { Link, Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import LoginPage from './auth/LoginPage'
import AdminPage from './pages/AdminPage'
import EventsPage from './pages/EventsPage'
import ChatPage from './pages/ChatPage'

function NavBar() {
  const { token, logout } = useAuth()
  return (
    <header style={{display:'flex',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid #ddd'}}>
      <nav style={{display:'flex',gap:12}}>
        <Link to="/">Home</Link>
        <Link to="/events">Events</Link>
        <Link to="/admin">Admin</Link>
        <Link to="/chat">AI Chat</Link>
      </nav>
      <div>
        {token ? <button onClick={logout}>Logout</button> : <Link to="/login">Login</Link>}
      </div>
    </header>
  )
}

function Home() {
  return (
    <main style={{padding:16}}>
      <h1>EduOrg</h1>
      <p>Manage users, roles, permissions, and events with AI assistance.</p>
    </main>
  )
}

function AppRoutes(){
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App(){
  return (
    <AuthProvider>
      <NavBar />
      <AppRoutes />
    </AuthProvider>
  )
}

