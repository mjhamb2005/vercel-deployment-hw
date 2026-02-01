'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function CaptionsList() {
  const [captions, setCaptions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCaptions()
  }, [])

  async function fetchCaptions() {
    const { data, error } = await supabase
      .from('captions')
      .select('*')
      .limit(50)
    
    if (error) {
      console.error('Error:', error)
    } else {
      setCaptions(data)
    }
    setLoading(false)
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Crackd Captions</h1>
      <div className="space-y-4">
        {captions.map((caption) => (
          <div key={caption.id} className="border p-4 rounded bg-white shadow">
            <p className="text-lg font-semibold mb-2">{caption.content}</p>
            <p className="text-sm text-gray-500">Created: {new Date(caption.created_datetime_utc).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
