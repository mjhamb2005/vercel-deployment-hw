'use client'
import { useEffect, useState, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function CaptionsList() {
  const [captions, setCaptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [votes, setVotes] = useState({})
  const [submitting, setSubmitting] = useState(null)

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ), [])

  useEffect(() => {
    fetchCaptions()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchMyVotes(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchMyVotes(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchCaptions() {
    const { data, error } = await supabase
      .from('captions')
      .select('*, images(url)')
      .not('image_id', 'is', null)
      .limit(20)

    if (!error) setCaptions(data.filter(c => c.images?.url))
    setLoading(false)
  }

  async function fetchMyVotes(userId) {
    const { data, error } = await supabase
      .from('caption_votes')
      .select('caption_id, vote_value')
      .eq('profile_id', userId)

    if (!error && data) {
      const voteMap = {}
      data.forEach(v => { voteMap[v.caption_id] = v.vote_value })
      setVotes(voteMap)
    }
  }

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  async function submitVote(captionId, voteValue) {
    if (!user) {
      await signIn()
      return
    }

    setSubmitting(captionId)

    const { error } = await supabase
      .from('caption_votes')
      .insert({
        caption_id: captionId,
        profile_id: user.id,
        vote_value: voteValue,
        created_datetime_utc: new Date().toISOString(),
      })

    if (error) {
      console.error('Vote error:', JSON.stringify(error))
    } else {
      setVotes(prev => ({ ...prev, [captionId]: voteValue }))
    }

    setSubmitting(null)
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen text-gray-500">
      Loading...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Caption Rater</h1>

        {!user ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-6 py-4 text-center mb-8">
            <p className="font-medium mb-3">Sign in to upvote or downvote captions.</p>
            <button
              onClick={signIn}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-5 py-2 rounded-lg transition"
            >
              Sign in with Google
            </button>
          </div>
        ) : (
          <p className="text-center text-green-600 font-medium mb-8">
            ✅ Logged in as {user.email}
          </p>
        )}

        <div className="space-y-8">
          {captions.map((caption) => {
            const myVote = votes[caption.id]
            const hasVoted = myVote !== undefined
            const isSubmitting = submitting === caption.id

            return (
              <div key={caption.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
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

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => submitVote(caption.id, 1)}
                      disabled={isSubmitting || hasVoted}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-lg font-semibold transition
                        ${myVote === 1
                          ? 'bg-green-500 text-white'
                          : hasVoted
                          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                          : 'bg-green-100 text-green-600 hover:bg-green-500 hover:text-white'
                        }`}
                    >
                      👍 Upvote
                    </button>

                    <button
                      onClick={() => submitVote(caption.id, -1)}
                      disabled={isSubmitting || hasVoted}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-lg font-semibold transition
                        ${myVote === -1
                          ? 'bg-red-500 text-white'
                          : hasVoted
                          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                          : 'bg-red-100 text-red-500 hover:bg-red-500 hover:text-white'
                        }`}
                    >
                      👎 Downvote
                    </button>

                    {isSubmitting && (
                      <span className="text-gray-400 text-sm">Saving...</span>
                    )}
                    {myVote === 1 && (
                      <span className="text-green-600 text-sm font-medium">✓ Upvoted!</span>
                    )}
                    {myVote === -1 && (
                      <span className="text-red-500 text-sm font-medium">✓ Downvoted!</span>
                    )}
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
