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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchMyVotes(session.user.id)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchCaptions() {
    const { data, error } = await supabase
      .from('captions').select('*, images(url)')
      .not('image_id', 'is', null).limit(20)
    if (!error) setCaptions(data.filter(c => c.images?.url))
    setLoading(false)
  }

  async function fetchMyVotes(userId) {
    const { data, error } = await supabase
      .from('caption_votes').select('caption_id, vote_value').eq('profile_id', userId)
    if (!error && data) {
      const m = {}; data.forEach(v => { m[v.caption_id] = v.vote_value }); setVotes(m)
    }
  }

  async function signIn() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
  }

  async function submitVote(captionId, voteValue) {
    if (!user) { await signIn(); return }
    setSubmitting(captionId)
    const cur = votes[captionId]
    if (cur === voteValue) {
      const { error } = await supabase.from('caption_votes').delete().eq('caption_id', captionId).eq('profile_id', user.id)
      if (!error) setVotes(p => { const n={...p}; delete n[captionId]; return n })
    } else if (cur !== undefined) {
      const { error } = await supabase.from('caption_votes').update({ vote_value: voteValue }).eq('caption_id', captionId).eq('profile_id', user.id)
      if (!error) setVotes(p => ({ ...p, [captionId]: voteValue }))
    } else {
      const { error } = await supabase.from('caption_votes').insert({ caption_id: captionId, profile_id: user.id, vote_value: voteValue, created_datetime_utc: new Date().toISOString() })
      if (!error) setVotes(p => ({ ...p, [captionId]: voteValue }))
    }
    setSubmitting(null)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@300;400&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { background: #080810; }

        .page { min-height: 100vh; background: #080810; color: #fff; font-family: 'DM Mono', monospace; }

        .bg-grid {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-color: #080810;
          background-image:
            repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.018) 40px, rgba(255,255,255,0.018) 41px),
            repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(255,255,255,0.018) 80px, rgba(255,255,255,0.018) 81px);
        }
        .emoji-field { position: fixed; inset: 0; z-index: 1; overflow: hidden; pointer-events: none; }
        .e { position: absolute; font-size: 44px; opacity: 0; animation: rain linear infinite;
          filter: drop-shadow(0 0 6px rgba(255,220,50,0.35)); }
        .e:nth-child(1)  { left:4%;   animation-duration:10s; animation-delay:0s; }
        .e:nth-child(2)  { left:16%;  animation-duration:13s; animation-delay:3s; }
        .e:nth-child(3)  { left:30%;  animation-duration:9s;  animation-delay:1s; }
        .e:nth-child(4)  { left:55%;  animation-duration:15s; animation-delay:5s; }
        .e:nth-child(5)  { left:72%;  animation-duration:11s; animation-delay:2s; }
        .e:nth-child(6)  { left:88%;  animation-duration:12s; animation-delay:4s; }
        @keyframes rain {
          0%   { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          8%   { opacity: 0.2; }
          92%  { opacity: 0.2; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
        .glow { position: fixed; border-radius: 50%; pointer-events: none; z-index: 1; }
        .glow-r { width:500px; height:250px; top:10%; left:-5%;
          background: radial-gradient(ellipse, rgba(255,40,70,0.08), transparent 70%); }
        .glow-b { width:500px; height:250px; top:10%; right:-5%;
          background: radial-gradient(ellipse, rgba(0,200,255,0.07), transparent 70%); }

        nav {
          position: sticky; top: 0; z-index: 100;
          display: flex; justify-content: space-between; align-items: center;
          padding: 22px 48px; border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(8,8,16,0.85); backdrop-filter: blur(16px);
        }
        .logo {
          font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800;
          color: #fff; letter-spacing: -0.02em; text-decoration: none;
        }
        .nav-links { display: flex; gap: 28px; align-items: center; }
        .nav-link {
          color: rgba(255,255,255,0.4); font-size: 11px; text-decoration: none;
          letter-spacing: 0.14em; text-transform: uppercase; transition: color 0.15s;
        }
        .nav-link:hover { color: #fff; }
        .nav-btn {
          background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 999px;
          padding: 8px 20px; cursor: pointer; font-family: 'DM Mono', monospace;
          font-size: 11px; letter-spacing: 0.1em; transition: all 0.15s;
        }
        .nav-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

        .hero {
          position: relative; z-index: 10;
          text-align: center; padding: 56px 24px 40px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .hero-title {
          font-family: 'Syne', sans-serif; font-size: clamp(36px,6vw,72px);
          font-weight: 800; letter-spacing: -0.03em; margin-bottom: 10px;
          background: linear-gradient(135deg, #ff6478, #ff9f43, #ffd700);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .hero-sub { font-size: 11px; color: rgba(255,255,255,0.25); letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 20px; }

        .sign-in-pill {
          display: inline-flex; align-items: center; gap: 10px;
          background: rgba(255,159,67,0.08); border: 1px solid rgba(255,159,67,0.2);
          border-radius: 999px; padding: 10px 10px 10px 18px;
        }
        .sign-in-text { font-size: 12px; color: #ff9f43; }
        .sign-in-btn {
          background: linear-gradient(135deg, #ff6478, #ff9f43);
          color: #fff; border: none; border-radius: 999px;
          padding: 8px 18px; cursor: pointer; font-family: 'DM Mono', monospace;
          font-size: 11px; letter-spacing: 0.06em; transition: opacity 0.15s;
        }
        .sign-in-btn:hover { opacity: 0.85; }
        .user-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(255,255,255,0.3); }
        .user-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; display: inline-block; }

        .feed { max-width: 680px; margin: 0 auto; padding: 40px 24px 80px; position: relative; z-index: 10; }

        .caption-card {
          background: rgba(255,255,255,0.03); border-radius: 20px; overflow: hidden;
          margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.07);
          transition: all 0.2s;
        }
        .caption-card:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.13);
          transform: translateY(-2px);
        }
        .card-img { background: rgba(255,255,255,0.02); display: flex; justify-content: center; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .card-img img { max-height: 380px; width: 100%; object-fit: contain; display: block; }

        .card-body { padding: 22px 26px 26px; }
        .caption-text {
          font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 600;
          color: rgba(255,255,255,0.9); margin-bottom: 18px; line-height: 1.5;
        }

        .vote-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .vote-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 20px; border-radius: 999px;
          font-family: 'DM Mono', monospace; font-size: 11px;
          letter-spacing: 0.05em; cursor: pointer; transition: all 0.15s;
          border: 1px solid transparent;
        }
        .upvote-default   { background: rgba(74,222,128,0.08); color: #4ade80; border-color: rgba(74,222,128,0.2); }
        .upvote-default:hover { background: #4ade80; color: #080810; border-color: #4ade80; }
        .upvote-active    { background: #4ade80; color: #080810; border-color: #4ade80; }
        .downvote-default { background: rgba(248,113,113,0.08); color: #f87171; border-color: rgba(248,113,113,0.2); }
        .downvote-default:hover { background: #f87171; color: #080810; border-color: #f87171; }
        .downvote-active  { background: #f87171; color: #080810; border-color: #f87171; }

        .undo-hint { font-size: 10px; color: rgba(255,255,255,0.15); letter-spacing: 0.05em; }
        .saving    { font-size: 11px; color: rgba(255,255,255,0.25); }
        .voted-up  { font-size: 11px; color: #4ade80; }
        .voted-dn  { font-size: 11px; color: #f87171; }

        .loading {
          display: flex; justify-content: center; align-items: center;
          min-height: 50vh; font-size: 12px; color: rgba(255,255,255,0.2); letter-spacing: 0.12em;
          position: relative; z-index: 10;
        }

        @media (max-width: 768px) {
          nav { padding: 16px 20px; }
          .feed { padding: 24px 16px 60px; }
          .card-body { padding: 18px 20px 22px; }
        }
      `}</style>

      <div className="page">
        <div className="bg-grid" />
        <div className="emoji-field">
          {['😂','🤣','😂','💀','😂','🤣'].map((e,i) => <span key={i} className="e">{e}</span>)}
        </div>
        <div className="glow glow-r" />
        <div className="glow glow-b" />

        <nav>
          <Link href="/" className="logo">crackd.</Link>
          <div className="nav-links">
            <Link href="/upload" className="nav-link">Upload</Link>
            <Link href="/protected" className="nav-link">Profile</Link>
            {user
              ? <button onClick={() => supabase.auth.signOut()} className="nav-btn">Sign Out</button>
              : <button onClick={signIn} className="nav-btn">Sign In →</button>
            }
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
              const isSubmitting = submitting === caption.id
              return (
                <div key={caption.id} className="caption-card">
                  <div className="card-img">
                    <img src={caption.images.url} alt="Meme" />
                  </div>
                  <div className="card-body">
                    <p className="caption-text">{caption.content}</p>
                    <div className="vote-row">
                      <button onClick={() => submitVote(caption.id, 1)} disabled={isSubmitting}
                        className={`vote-btn ${myVote === 1 ? 'upvote-active' : 'upvote-default'}`}>
                        👍 Upvote
                      </button>
                      <button onClick={() => submitVote(caption.id, -1)} disabled={isSubmitting}
                        className={`vote-btn ${myVote === -1 ? 'downvote-active' : 'downvote-default'}`}>
                        👎 Downvote
                      </button>
                      {isSubmitting && <span className="saving">saving...</span>}
                      {!isSubmitting && myVote !== undefined && <span className="undo-hint">click to undo</span>}
                      {myVote === 1 && <span className="voted-up">✓ upvoted</span>}
                      {myVote === -1 && <span className="voted-dn">✓ downvoted</span>}
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