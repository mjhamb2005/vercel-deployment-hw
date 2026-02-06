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
      .select(`
        *,
        images (
          url
        )
      `)
      .not('image_id', 'is', null)
      .limit(50)

    if (error) {
      console.error('Error:', error)
    } else {
      const captionsWithImages = data.filter(caption => caption.images?.url)
      setCaptions(captionsWithImages)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
        <div className="text-2xl font-semibold text-blue-600">Loading captions...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-12">
          <h1 className="text-5xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            Crackd Captions
          </h1>
          <p className="text-center text-blue-600 text-lg font-medium">
            AI-Generated Humor at Its Finest ✨
          </p>
        </div>

        <div className="space-y-8">
          {captions.map((caption) => (
            <div
              key={caption.id}
              className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border-2 border-blue-100"
            >
              {caption.images?.url && (
                <div className="relative w-full bg-gradient-to-br from-blue-50 to-white p-4">
                  <img
                    src={caption.images.url}
                    alt="Meme"
                    className="w-full object-contain max-h-96 mx-auto rounded-lg shadow-md"
                  />
                </div>
              )}
              <div className="p-6 bg-gradient-to-br from-white to-blue-50">
                <p className="text-xl font-bold text-gray-800 mb-4 leading-relaxed">
                  {caption.content}
                </p>
                <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                  <span>📅</span>
                  <span>{new Date(caption.created_datetime_utc).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}