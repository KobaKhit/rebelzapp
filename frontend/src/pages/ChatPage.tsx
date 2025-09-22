import React, { useState } from 'react'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export default function ChatPage(){
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState<string>('auto')
  const [loading, setLoading] = useState(false)

  const send = async () => {
    const text = input.trim()
    if(!text) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    try{
      const res = await fetch('/ai/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ messages: messages.concat({ role: 'user', content: text }) }) })
      if(!res.ok) throw new Error('Request failed')
      const data = await res.json()
      setModel(data.model || 'unknown')
      const choice = (data.choices && data.choices[0]) || {}
      const msg = choice.message || { role: 'assistant', content: '[no response]' }
      setMessages(prev => [...prev, msg])
    } catch(err: any){
      alert(err?.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{padding:16, display:'grid', gap:12}}>
      <h2>AI Chat <small style={{fontWeight:'normal'}}>model: {model}</small></h2>
      <div style={{display:'grid', gap:8}}>
        <div style={{border:'1px solid #eee', padding:8, minHeight:200}}>
          {messages.map((m,i)=> <div key={i} style={{padding:'4px 0'}}><strong>{m.role}:</strong> {m.content}</div>)}
        </div>
        <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about schedules, classes, events..." />
        <div>
          <button onClick={send} disabled={loading}>{loading ? 'Sending...' : 'Send'}</button>
          <button onClick={()=>setMessages([])} style={{marginLeft:8}}>Clear</button>
        </div>
      </div>
    </main>
  )
}

