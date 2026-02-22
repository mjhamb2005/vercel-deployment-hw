'use client'
import { useEffect, useState, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  async function submitVote(captionId, voteValue) {
    if (!user) { await signIn(); return }
    setSubmitting(captionId)

    const currentVote = votes[captionId]

    // If clicking same button → undo (delete)
    if (currentVote === voteValue) {
      const { error } = await supabase
        .from('caption_votes')
        .delete()
        .eq('caption_id', captionId)
        .eq('profile_id', user.id)

      if (!error) {
        setVotes(prev => {
          const next = { ...prev }
          delete next[captionId]
          return next
        })
      }
    }
    // If switching vote → update
    else if (currentVote !== undefined) {
      const { error } = await supabase
        .from('caption_votes')
        .update({ vote_value: voteValue })
        .eq('caption_id', captionId)
        .eq('profile_id', user.id)

      if (!error) setVotes(prev => ({ ...prev, [captionId]: voteValue }))
    }
    // New vote → insert
    else {
      const { error } = await supabase
        .from('caption_votes')
        .insert({
          caption_id: captionId,
          profile_id: user.id,
          vote_value: voteValue,
          created_datetime_utc: new Date().toISOString(),
        })

      if (!error) setVotes(prev => ({ ...prev, [captionId]: voteValue }))
    }

    setSubmitting(null)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@300;400&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #faf8f5; }

        .page { min-height: 100vh; background: #faf8f5; font-family: 'DM Mono', monospace; }

        nav {
          display: flex; justify-content: space-between; align-items: center;
          padding: 20px 48px; border-bottom: 1px solid #ede8e1;
          background: #faf8f5; position: sticky; top: 0; z-index: 100;
        }

        .logo {
          font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800;
          background: linear-gradient(135deg, #ff6478, #ff9f43, #ffd700);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; text-decoration: none; letter-spacing: -0.03em;
        }

        .nav-right { display: flex; gap: 24px; align-items: center; }

        .nav-link {
          color: #bbb; font-size: 11px; text-decoration: none;
          letter-spacing: 0.1em; text-transform: uppercase; transition: color 0.2s;
        }
        .nav-link:hover { color: #1a1a1a; }

        .nav-btn {
          background: #1a1a1a; color: #faf8f5; border: none;
          border-radius: 999px; padding: 8px 20px; cursor: pointer;
          font-family: 'DM Mono', monospace; font-size: 11px;
          letter-spacing: 0.08em; transition: all 0.2s;
        }
        .nav-btn:hover { background: #333; }

        .nav-btn-out {
          background: transparent; color: #bbb; border: 1px solid #e0d8ce;
          border-radius: 999px; padding: 8px 20px; cursor: pointer;
          font-family: 'DM Mono', monospace; font-size: 11px;
          letter-spacing: 0.08em; transition: all 0.2s;
        }
        .nav-btn-out:hover { border-color: #bbb; color: #1a1a1a; }

        .hero {
          text-align: center; padding: 56px 24px 40px;
          border-bottom: 1px solid #ede8e1;
        }

        .hero-title {
          font-family: 'Syne', sans-serif; font-size: clamp(36px, 6vw, 64px);
          font-weight: 800; color: #1a1a1a; letter-spacing: -0.03em; margin-bottom: 12px;
        }

        .hero-sub {
          font-size: 11px; color: #bbb; letter-spacing: 0.15em;
          text-transform: uppercase; margin-bottom: 20px;
        }

        .sign-in-banner {
          display: inline-flex; align-items: center; gap: 12px;
          background: #fff8f0; border: 1px solid #fde8cc;
          border-radius: 999px; padding: 10px 20px; margin-top: 8px;
          font-size: 12px; color: #cc7a00;
        }

        .sign-in-btn {
          background: #ff9f43; color: #fff; border: none;
          border-radius: 999px; padding: 6px 16px; cursor: pointer;
          font-family: 'DM Mono', monospace; font-size: 11px;
          letter-spacing: 0.06em; transition: background 0.2s;
        }
        .sign-in-btn:hover { background: #e8893a; }

        .feed { max-width: 680px; margin: 0 auto; padding: 40px 24px; }

        .caption-card {
          background: #fff; border-radius: 20px; overflow: hidden;
          margin-bottom: 24px; border: 1px solid #ede8e1;
          box-shadow: 0 2px 16px rgba(0,0,0,0.04);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .caption-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
        }

        .card-img { background: #f5f0ea; display: flex; justify-content: center; }
        .card-img img { max-height: 360px; width: 100%; object-fit: contain; display: block; }

        .card-body { padding: 24px 28px; }

        .caption-text {
          font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 400;
          color: #1a1a1a; margin-bottom: 20px; line-height: 1.5;
        }

        .vote-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

        .vote-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 22px; border-radius: 999px; border: none;
          font-family: 'DM Mono', monospace; font-size: 12px;
          letter-spacing: 0.06em; cursor: pointer; transition: all 0.2s;
        }

        .upvote-default { background: #f0fdf4; color: #16a34a; }
        .upvote-default:hover { background: #16a34a; color: #fff; }
        .upvote-active { background: #16a34a; color: #fff; }
        .upvote-active:hover { background: #dc2626; color: #fff; }

        .downvote-default { background: #fff5f5; color: #ef4444; }
        .downvote-default:hover { background: #ef4444; color: #fff; }
        .downvote-active { background: #ef4444; color: #fff; }
        .downvote-active:hover { background: #16a34a; color: #fff; }

        .undo-hint {
          font-size: 10px; color: #ddd; letter-spacing: 0.05em;
          font-style: italic;
        }

        .vote-status { font-size: 11px; color: #bbb; letter-spacing: 0.05em; }
        .vote-status-up { color: #16a34a; }
        .vote-status-down { color: #ef4444; }

        .loading {
          display: flex; justify-content: center; align-items: center;
          min-height: 60vh; font-size: 13px; color: #bbb; letter-spacing: 0.1em;
        }

        @media (max-width: 768px) {
          nav { padding: 16px 24px; }
          .feed { padding: 24px 16px; }
          .card-body { padding: 20px; }
        }
      `}</style>

      <div className="page">
        <nav>
          <Link href="/" className="logo">crackd.</Link>
          <div className="nav-right">
            <Link href="/upload" className="nav-link">Upload</Link>
            <Link href="/protected" className="nav-link">Profile</Link>
            {user ? (
              <button onClick={signOut} className="nav-btn-out">Sign Out</button>
            ) : (
              <button onClick={signIn} className="nav-btn">Sign In →</button>
            )}
          </div>
        </nav>

        <div className="hero">
          <h1 className="hero-title">Rate Captions</h1>
          <p className="hero-sub">vote on AI-generated captions · click again to undo</p>
          {!user && (
            <div className="sign-in-banner">
              <span>Sign in to vote</span>
              <button onClick={signIn} className="sign-in-btn">sign in with google →</button>
            </div>
          )}
          {user && (
            <p style={{ fontSize: '11px', color: '#bbb', marginTop: '8px' }}>
              ✓ signed in as {user.email}
            </p>
          )}
        </div>

        {loading ? (
          <div className="loading">loading captions...</div>
        ) : (
          <div className="feed">
            {captions.map((caption) => {
              const myVote = votes[caption.id]
              const hasVoted = myVote !== undefined
              const isSubmitting = submitting === caption.id

              return (
                <div key={caption.id} className="caption-card">
                  <div className="card-img">
                    <img src={caption.images.url} alt="Meme" />
                  </div>
                  <div className="card-body">
                    <p className="caption-text">{caption.content}</p>
                    <div className="vote-row">
                      <button
                        onClick={() => submitVote(caption.id, 1)}
                        disabled={isSubmitting}
                        className={`vote-btn ${myVote === 1 ? 'upvote-active' : 'upvote-default'}`}
                      >
                        👍 Upvote
                      </button>
                      <button
                        onClick={() => submitVote(caption.id, -1)}
                        disabled={isSubmitting}
                        className={`vote-btn ${myVote === -1 ? 'downvote-active' : 'downvote-default'}`}
                      >
                        👎 Downvote
                      </button>
                      {isSubmitting && <span className="vote-status">saving...</span>}
                      {!isSubmitting && hasVoted && (
                        <span className="undo-hint">click again to undo</span>
                      )}
                      {myVote === 1 && <span className="vote-status vote-status-up">✓ upvoted</span>}
                      {myVote === -1 && <span className="vote-status vote-status-down">✓ downvoted</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}