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

    if (currentVote === voteValue) {
      const { error } = await supabase
        .from('caption_votes')
        .delete()
        .eq('caption_id', captionId)
        .eq('profile_id', user.id)
      if (!error) setVotes(prev => { const n = { ...prev }; delete n[captionId]; return n })
    } else if (currentVote !== undefined) {
      const { error } = await supabase
        .from('caption_votes')
        .update({ vote_value: voteValue })
        .eq('caption_id', captionId)
        .eq('profile_id', user.id)
      if (!error) setVotes(prev => ({ ...prev, [captionId]: voteValue }))
    } else {
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
        body { background: #ffffff; }

        .page { min-height: 100vh; background: #ffffff; color: #111; font-family: 'DM Mono', monospace; }

        nav {
          position: sticky; top: 0; z-index: 100;
          display: flex; justify-content: space-between; align-items: center;
          padding: 0 48px; height: 64px;
          border-bottom: 1px solid #f0f0f0;
          background: rgba(255,255,255,0.92); backdrop-filter: blur(12px);
        }

        .logo {
          font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800;
          background: linear-gradient(135deg, #ff6478, #ff9f43, #ffd700);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; text-decoration: none; letter-spacing: -0.03em;
        }

        .nav-right { display: flex; gap: 32px; align-items: center; }

        .nav-link {
          color: #999; font-size: 11px; text-decoration: none;
          letter-spacing: 0.1em; text-transform: uppercase; transition: color 0.15s;
        }
        .nav-link:hover { color: #111; }

        .nav-btn-in {
          background: #111; color: #fff; border: none;
          border-radius: 999px; padding: 8px 20px; cursor: pointer;
          font-family: 'DM Mono', monospace; font-size: 11px;
          letter-spacing: 0.08em; transition: background 0.15s;
        }
        .nav-btn-in:hover { background: #333; }

        .nav-btn-out {
          background: transparent; color: #999; border: 1px solid #e8e8e8;
          border-radius: 999px; padding: 8px 20px; cursor: pointer;
          font-family: 'DM Mono', monospace; font-size: 11px;
          letter-spacing: 0.08em; transition: all 0.15s;
        }
        .nav-btn-out:hover { border-color: #ccc; color: #111; }

        .hero {
          text-align: center; padding: 64px 24px 48px;
          border-bottom: 1px solid #f0f0f0;
        }

        .hero-title {
          font-family: 'Syne', sans-serif; font-size: clamp(36px, 6vw, 72px);
          font-weight: 800; color: #111; letter-spacing: -0.04em; margin-bottom: 10px;
          line-height: 1;
        }

        .hero-sub {
          font-size: 11px; color: #bbb; letter-spacing: 0.18em;
          text-transform: uppercase; margin-bottom: 24px;
        }

        .sign-in-pill {
          display: inline-flex; align-items: center; gap: 10px;
          background: #fff8f2; border: 1px solid #ffe0c4;
          border-radius: 999px; padding: 10px 10px 10px 18px;
        }

        .sign-in-text { font-size: 12px; color: #cc7000; letter-spacing: 0.04em; }

        .sign-in-btn {
          background: linear-gradient(135deg, #ff6478, #ff9f43);
          color: #fff; border: none; border-radius: 999px;
          padding: 8px 18px; cursor: pointer; font-family: 'DM Mono', monospace;
          font-size: 11px; letter-spacing: 0.06em; transition: opacity 0.15s;
        }
        .sign-in-btn:hover { opacity: 0.85; }

        .user-tag {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11px; color: #bbb;
        }
        .user-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; display: inline-block; }

        .feed { max-width: 660px; margin: 0 auto; padding: 40px 24px 80px; }

        .caption-card {
          background: #fff; border-radius: 16px; overflow: hidden;
          margin-bottom: 16px; border: 1px solid #f0f0f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04);
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .caption-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.08);
          transform: translateY(-2px);
        }

        .card-img { background: #fafafa; display: flex; justify-content: center; border-bottom: 1px solid #f5f5f5; }
        .card-img img { max-height: 380px; width: 100%; object-fit: contain; display: block; }

        .card-body { padding: 20px 24px 24px; }

        .caption-text {
          font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 600;
          color: #111; margin-bottom: 18px; line-height: 1.5;
        }

        .vote-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

        .vote-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 18px; border-radius: 999px; border: 1px solid transparent;
          font-family: 'DM Mono', monospace; font-size: 11px;
          letter-spacing: 0.05em; cursor: pointer; transition: all 0.15s; font-weight: 400;
        }

        .upvote-default { background: #f0fdf4; color: #16a34a; border-color: #dcfce7; }
        .upvote-default:hover { background: #16a34a; color: #fff; border-color: #16a34a; }
        .upvote-active { background: #16a34a; color: #fff; border-color: #16a34a; }

        .downvote-default { background: #fff5f5; color: #dc2626; border-color: #fee2e2; }
        .downvote-default:hover { background: #dc2626; color: #fff; border-color: #dc2626; }
        .downvote-active { background: #dc2626; color: #fff; border-color: #dc2626; }

        .undo-hint { font-size: 10px; color: #ddd; letter-spacing: 0.05em; }
        .saving { font-size: 11px; color: #ccc; }
        .voted-up { font-size: 11px; color: #16a34a; }
        .voted-down { font-size: 11px; color: #dc2626; }

        .loading {
          display: flex; justify-content: center; align-items: center;
          min-height: 50vh; font-size: 12px; color: #ccc; letter-spacing: 0.1em;
        }

        @media (max-width: 768px) {
          nav { padding: 0 20px; }
          .feed { padding: 24px 16px 60px; }
          .card-body { padding: 16px 20px 20px; }
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
              <button onClick={signIn} className="nav-btn-in">Sign In →</button>
            )}
          </div>
        </nav>

        <div className="hero">
          <h1 className="hero-title">Rate Captions</h1>
          <p className="hero-sub">vote · click again to undo</p>
          {!user ? (
            <div className="sign-in-pill">
              <span className="sign-in-text">Sign in to vote</span>
              <button onClick={signIn} className="sign-in-btn">sign in with google →</button>
            </div>
          ) : (
            <span className="user-tag"><span className="user-dot" />{user.email}</span>
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
                      {isSubmitting && <span className="saving">saving...</span>}
                      {!isSubmitting && hasVoted && <span className="undo-hint">click to undo</span>}
                      {myVote === 1 && <span className="voted-up">✓ upvoted</span>}
                      {myVote === -1 && <span className="voted-down">✓ downvoted</span>}
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