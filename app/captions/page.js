'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function CaptionsList() {
  const [captions, setCaptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [votes, setVotes] = useState({})
  const [submitting, setSubmitting] = useState(null)

  useEffect(() => {
    fetchCaptions()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchCaptions() {
    const { data, error } = await supabase
      .from('captions')
      .select(`*, images(url)`)
      .not('image_id', 'is', null)
      .limit(20)

    if (error) {
      console.error('Error fetching captions:', error)
    } else {
      setCaptions(data.filter(c => c.images?.url))
    }
    setLoading(false)
  }

  async function submitVote(captionId, rating) {
    if (!user) {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      return
    }

    setSubmitting(captionId)

    const { error } = await supabase
      .from('caption_votes')
      .insert({
        caption_id: captionId,
        profile_id: user.id,
        vote_value: rating,
        created_datetime_utc: new Date().toISOString(),
      })

    if (error) {
      console.error('Error submitting vote:', error)
      alert('Failed to submit vote: ' + JSON.stringify(error))
    } else {
      setVotes(prev => ({ ...prev, [captionId]: rating }))
    }

    setSubmitting(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <p className="text-2xl font-semibold text-gray-600">Loading captions...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">

        <h1 className="text-5xl font-bold text-center mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Crackd Captions
        </h1>
        <p className="text-center text-gray-500 mb-4 text-lg">Rate the funniness!</p>

        <div className="text-center mb-10">
          {user ? (
            <p className="text-green-600 font-medium">✅ Logged in as {user.email}</p>
          ) : (
            <p className="text-amber-600 font-medium">
              ⚠️ You must{' '}
              <button
                onClick={() =>
                  supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo: `${window.location.origin}/auth/callback` },
                  })
                }
                className="underline font-bold hover:text-amber-800"
              >
                sign in with Google
              </button>{' '}
              to rate captions.
            </p>
          )}
        </div>

        <div className="space-y-8">
          {captions.map((caption) => {
            const myVote = votes[caption.id]
            const isSubmitting = submitting === caption.id

            return (
              <div
                key={caption.id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300"
              >
                <div className="bg-gray-100 flex justify-center">
                  <img
                    src={caption.images.url}
                    alt="Meme"
                    className="object-contain max-h-96 w-full"
                  />
                </div>

                <div className="p-6">
                  <p className="text-xl font-semibold text-gray-800 mb-5 leading-relaxed">
                    {caption.content}
                  </p>

                  <div>
                    <p className="text-sm text-gray-500 mb-2 font-medium">
                      {myVote ? `Your rating: ${myVote}/5` : 'Rate this caption:'}
                    </p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => submitVote(caption.id, star)}
                          disabled={isSubmitting || !!myVote}
                          className={`text-3xl transition-transform hover:scale-125 disabled:cursor-not-allowed ${
                            myVote
                              ? star <= myVote
                                ? 'opacity-100'
                                : 'opacity-30'
                              : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          ⭐
                        </button>
                      ))}
                      {isSubmitting && (
                        <span className="text-sm text-gray-400 self-center ml-2">Saving...</span>
                      )}
                      {myVote && (
                        <span className="text-sm text-green-500 self-center ml-2 font-medium">Saved!</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}