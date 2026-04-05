import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { showToast } from './Toast'

const NOTE_COLORS = [
  { name: 'dark',   bg: '#1a1a2e', accent: '#9c27b0' },
  { name: 'teal',   bg: '#0a1a18', accent: '#00bcd4' },
  { name: 'green',  bg: '#0a1a0a', accent: '#4caf50' },
  { name: 'orange', bg: '#1a1000', accent: '#ff9800' },
  { name: 'red',    bg: '#1a0808', accent: '#ef4444' },
  { name: 'blue',   bg: '#080e1a', accent: '#378add' },
  { name: 'pink',   bg: '#1a0814', accent: '#e91e63' },
  { name: 'gold',   bg: '#1a1400', accent: '#fde047' },
]
const getColor = (name) => NOTE_COLORS.find(c => c.name === name) || NOTE_COLORS[0]

const TAGS = ['all', 'math', 'physics', 'coding', 'general', 'pinned']

const formatDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function StudyNotesTab({ user }) {
  const [notes, setNotes] = useState([])
  const [searchQ, setSearchQ] = useState('')
  const [filterTag, setFilterTag] = useState('all')
  const [gridView, setGridView] = useState(true)

  // Editor state
  const [showEditor, setShowEditor] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [edTitle, setEdTitle] = useState('')
  const [edBody, setEdBody] = useState('')
  const [selectedColor, setSelectedColor] = useState('dark')
  const [selectedTag, setSelectedTag] = useState('general')
  const [isPinned, setIsPinned] = useState(false)

  useEffect(() => { fetchNotes() }, [])

  const fetchNotes = async () => {
    const { data } = await supabase
      .from('study_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })
    setNotes(data || [])
  }

  const openEditor = (noteId) => {
    if (noteId) {
      const n = notes.find(x => x.id === noteId)
      if (!n) return
      setEditingId(n.id)
      setEdTitle(n.title)
      setEdBody(n.body || '')
      setSelectedColor(n.color || 'dark')
      setSelectedTag(n.tag || 'general')
      setIsPinned(n.pinned || false)
    } else {
      setEditingId(null)
      setEdTitle('')
      setEdBody('')
      setSelectedColor('dark')
      setSelectedTag('general')
      setIsPinned(false)
    }
    setShowEditor(true)
  }

  const closeEditor = () => setShowEditor(false)

  const saveNote = async () => {
    const title = edTitle.trim() || 'Untitled'
    const body = edBody.trim()
    if (editingId) {
      await supabase.from('study_notes').update({
        title, body, color: selectedColor, tag: selectedTag,
        pinned: isPinned, updated_at: new Date().toISOString()
      }).eq('id', editingId)
    } else {
      await supabase.from('study_notes').insert({
        user_id: user.id, title, body,
        color: selectedColor, tag: selectedTag, pinned: isPinned
      })
    }
    await fetchNotes()
    closeEditor()
    showToast('📝 Note saved!', 'success')
  }

  const deleteNote = async (id) => {
    if (!window.confirm('Delete this note?')) return
    await supabase.from('study_notes').delete().eq('id', id)
    await fetchNotes()
    closeEditor()
    showToast('🗑️ Note deleted', 'info')
  }

  const togglePin = async (e, id) => {
    e.stopPropagation()
    const note = notes.find(n => n.id === id)
    await supabase.from('study_notes').update({ pinned: !note.pinned }).eq('id', id)
    await fetchNotes()
  }

  const filteredNotes = notes.filter(note => {
    if (filterTag === 'pinned') return note.pinned
    if (filterTag !== 'all' && note.tag !== filterTag) return false
    if (searchQ) {
      const q = searchQ.toLowerCase()
      return note.title.toLowerCase().includes(q) || (note.body || '').toLowerCase().includes(q)
    }
    return true
  })
  const pinnedNotes = filteredNotes.filter(n => n.pinned)
  const unpinnedNotes = filteredNotes.filter(n => !n.pinned)
  const orderedNotes = [...pinnedNotes, ...unpinnedNotes]

  const cardStyle = (note) => {
    const c = getColor(note.color)
    return {
      background: c.bg,
      border: `1.5px solid ${c.accent}30`,
      borderRadius: 14,
      padding: 12,
      cursor: 'pointer',
      position: 'relative',
      minHeight: 100,
      transition: 'all 0.2s',
    }
  }

  const NoteCard = ({ note, list }) => {
    const c = getColor(note.color)
    return (
      <div
        onClick={() => openEditor(note.id)}
        style={list ? {
          background: c.bg,
          borderLeft: `3px solid ${c.accent}`,
          borderTop: `1px solid ${c.accent}20`,
          borderRight: `1px solid ${c.accent}20`,
          borderBottom: `1px solid ${c.accent}20`,
          borderRadius: 12,
          padding: '12px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          transition: 'all 0.2s',
          marginBottom: 8,
        } : cardStyle(note)}
      >
        {!list && note.pinned && (
          <span style={{ position: 'absolute', top: 8, right: 10, fontSize: 11, opacity: 0.6 }}>📌</span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e8e8f0', marginBottom: 4, lineHeight: 1.4, paddingRight: note.pinned && !list ? 16 : 0, whiteSpace: list ? 'nowrap' : undefined, overflow: list ? 'hidden' : undefined, textOverflow: list ? 'ellipsis' : undefined }}>
            {note.pinned && list && <span style={{ marginRight: 4, fontSize: 10 }}>📌</span>}
            {note.title}
          </div>
          {!list && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
              {(note.body || '').substring(0, 70)}{(note.body || '').length > 70 ? '...' : ''}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: list ? 0 : 8 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{formatDate(note.updated_at)}</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: `${c.accent}20`, color: c.accent }}>{note.tag}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 80 }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#e8e8f0' }}>📝 Notes</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[true, false].map(isGrid => (
            <button key={String(isGrid)} onClick={() => setGridView(isGrid)} style={{
              width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: gridView === isGrid ? '#ff980015' : '#0a0a12',
              border: `1px solid ${gridView === isGrid ? '#ff9800' : '#1e1e2a'}`,
              color: gridView === isGrid ? '#ff9800' : '#444', cursor: 'pointer', fontSize: 14
            }}>{isGrid ? '⊞' : '☰'}</button>
          ))}
        </div>
      </div>

      {/* Search */}
      <input
        value={searchQ} onChange={e => setSearchQ(e.target.value)}
        placeholder="Search notes..."
        style={{ background: '#0a0a12', border: '1px solid #1e1e2a', borderRadius: 12, padding: '10px 14px', color: '#e8e8f0', fontSize: 13, outline: 'none', width: '100%' }}
        onFocus={e => e.target.style.borderColor = '#ff980050'}
        onBlur={e => e.target.style.borderColor = '#1e1e2a'}
      />

      {/* Filter Pills */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingBottom: 2 }}>
        {TAGS.map(tag => (
          <button key={tag} onClick={() => setFilterTag(tag)} style={{
            flex: '1 1 auto', padding: '5px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', textAlign: 'center',
            background: filterTag === tag ? '#ff980015' : '#0a0a12',
            border: `1px solid ${filterTag === tag ? '#ff9800' : '#1e1e2a'}`,
            color: filterTag === tag ? '#ff9800' : '#444'
          }}>{tag}</button>
        ))}
      </div>

      {/* Notes Grid/List */}
      {orderedNotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#333' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📝</div>
          <div style={{ fontSize: 13 }}>{searchQ || filterTag !== 'all' ? 'No notes match.' : 'No notes yet. Tap + to create your first note.'}</div>
        </div>
      ) : gridView ? (
        <>
          {pinnedNotes.length > 0 && <div style={{ fontSize: 9, color: '#666', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>PINNED</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {orderedNotes.map(note => <NoteCard key={note.id} note={note} list={false} />)}
          </div>
        </>
      ) : (
        <>
          {pinnedNotes.length > 0 && <div style={{ fontSize: 9, color: '#666', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>PINNED</div>}
          {orderedNotes.map(note => <NoteCard key={note.id} note={note} list={true} />)}
        </>
      )}

      {/* FAB */}
      <button onClick={() => openEditor(null)} style={{
        width: 44, height: 44, borderRadius: '50%', background: '#ff9800', border: 'none',
        cursor: 'pointer', color: '#000', fontSize: 22, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        alignSelf: 'flex-end', marginTop: 8, boxShadow: '0 4px 20px rgba(255,152,0,0.4)',
        transition: 'transform 0.2s',
      }}>+</button>

      {/* Editor Modal */}
      {showEditor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={closeEditor}>
          <div style={{ background: '#0d0d14', borderRadius: '20px 20px 0 0', padding: 16, width: '100%', maxHeight: '90vh', overflowY: 'auto', animation: 'fadeSlideUp 0.25s ease' }} onClick={e => e.stopPropagation()}>

            {/* Color Picker */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: 14, paddingBottom: 2 }}>
              {NOTE_COLORS.map(c => (
                <div key={c.name} onClick={() => setSelectedColor(c.name)} style={{
                  width: 26, height: 26, borderRadius: '50%', background: c.bg,
                  border: `2px solid ${c.accent}`,
                  outline: selectedColor === c.name ? '2px solid #fff' : 'none',
                  outlineOffset: 2,
                  transform: selectedColor === c.name ? 'scale(1.15)' : 'scale(1)',
                  cursor: 'pointer', transition: 'all 0.15s'
                }} />
              ))}
            </div>

            {/* Title */}
            <input
              value={edTitle} onChange={e => setEdTitle(e.target.value)}
              placeholder="Title"
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #1e1e2a', color: '#e8e8f0', fontSize: 16, fontWeight: 800, padding: '8px 0', marginBottom: 12, outline: 'none' }}
            />

            {/* Body */}
            <textarea
              value={edBody} onChange={e => setEdBody(e.target.value)}
              placeholder="Write your note..."
              rows={5}
              style={{ width: '100%', background: 'transparent', border: 'none', color: '#aaaabc', fontSize: 13, lineHeight: 1.8, resize: 'none', outline: 'none', marginBottom: 16 }}
            />

            {/* Tag Selector */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {['math', 'physics', 'coding', 'general'].map(tag => (
                <button key={tag} onClick={() => setSelectedTag(tag)} style={{
                  padding: '5px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize',
                  background: selectedTag === tag ? '#ff980015' : '#0a0a12',
                  border: `1px solid ${selectedTag === tag ? '#ff9800' : '#1e1e2a'}`,
                  color: selectedTag === tag ? '#ff9800' : '#555'
                }}>{tag}</button>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveNote} style={{ flex: 2, padding: '12px 0', background: '#ff9800', border: 'none', borderRadius: 12, color: '#000', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                Save Note
              </button>
              <button onClick={closeEditor} style={{ flex: 1, padding: '12px 0', background: '#0a0a12', border: '1px solid #1e1e2a', borderRadius: 12, color: '#555', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => setIsPinned(p => !p)} style={{ width: 44, borderRadius: 12, background: '#0a0a12', border: '1px solid #1e1e2a', fontSize: 18, cursor: 'pointer', opacity: isPinned ? 1 : 0.4, transition: 'opacity 0.2s' }}>
                📌
              </button>
              {editingId && (
                <button onClick={() => deleteNote(editingId)} style={{ width: 44, borderRadius: 12, background: '#ef444415', border: '1px solid #ef444430', fontSize: 16, cursor: 'pointer' }}>
                  🗑️
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
