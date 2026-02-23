'use client'
import { useEffect, useState, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [mounted, setMounted] = useState(false)

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ), [])

  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@300;400&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0d0d0d; }

        .page {
          min-height: 100vh;
          background: #0d0d0d;
          color: #f5f0e8;
          font-family: 'DM Mono', monospace;
          position: relative;
          overflow-x: hidden;
        }

        .bg-gradient {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 50% at 20% 20%, rgba(255, 100, 120, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(100, 120, 255, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse 50% 60% at 50% 50%, rgba(255, 200, 80, 0.04) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        nav {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 48px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .logo {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 800;
          background: linear-gradient(135deg, #ff6478, #ff9f43, #ffd700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.03em;
        }

        .nav-links { display: flex; gap: 28px; align-items: center; }

        .nav-link {
          color: #555;
          font-size: 11px;
          text-decoration: none;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          transition: color 0.2s;
        }
        .nav-link:hover { color: #f5f0e8; }

        .nav-btn {
          background: rgba(255,255,255,0.06);
          color: #f5f0e8;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 999px;
          padding: 8px 20px;
          cursor: pointer;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.08em;
          transition: all 0.2s;
        }
        .nav-btn:hover { background: rgba(255,255,255,0.1); }

        .hero {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 24px 80px;
          text-align: center;
        }

        .badge {
          display: inline-block;
          background: rgba(255, 100, 120, 0.12);
          border: 1px solid rgba(255, 100, 120, 0.25);
          color: #ff8090;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          padding: 6px 16px;
          border-radius: 999px;
          margin-bottom: 40px;
          opacity: 0;
          animation: fadeUp 0.7s ease forwards;
        }

        .headline {
          font-family: 'Syne', sans-serif;
          font-size: clamp(60px, 11vw, 140px);
          font-weight: 800;
          line-height: 0.9;
          letter-spacing: -0.04em;
          margin-bottom: 32px;
          opacity: 0;
          animation: fadeUp 0.7s ease 0.1s forwards;
        }

        .headline .line1 { display: block; color: #f5f0e8; }
        .headline .line2 {
          display: block;
          background: linear-gradient(135deg, #ff6478 0%, #ff9f43 50%, #ffd700 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .tagline {
          font-size: 13px;
          color: #555;
          letter-spacing: 0.05em;
          max-width: 380px;
          line-height: 2;
          margin-bottom: 48px;
          opacity: 0;
          animation: fadeUp 0.7s ease 0.2s forwards;
        }

        .user-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 999px;
          padding: 6px 16px;
          font-size: 11px;
          color: #444;
          margin-bottom: 32px;
          opacity: 0;
          animation: fadeUp 0.7s ease 0.25s forwards;
        }

        .user-dot { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; }

        .cta-group {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
          opacity: 0;
          animation: fadeUp 0.7s ease 0.3s forwards;
        }

        .cta-primary {
          background: linear-gradient(135deg, #ff6478, #ff9f43);
          color: #0d0d0d;
          text-decoration: none;
          border-radius: 999px;
          padding: 16px 36px;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          transition: all 0.2s;
          box-shadow: 0 0 40px rgba(255, 100, 120, 0.2);
        }
        .cta-primary:hover { transform: translateY(-2px); box-shadow: 0 0 60px rgba(255, 100, 120, 0.35); }

        .cta-secondary {
          background: transparent;
          color: #f5f0e8;
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px;
          padding: 16px 36px;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          transition: all 0.2s;
        }
        .cta-secondary:hover { border-color: rgba(255,255,255,0.3); transform: translateY(-2px); }

        .divider {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 0 48px;
          opacity: 0;
          animation: fadeUp 0.7s ease 0.4s forwards;
        }

        .divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.05); }
        .divider-text { font-size: 10px; color: #2a2a2a; letter-spacing: 0.15em; text-transform: uppercase; }

        .cards {
          position: relative;
          z-index: 10;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          padding: 32px 48px;
          opacity: 0;
          animation: fadeUp 0.7s ease 0.5s forwards;
        }

        .card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 32px 28px;
          text-decoration: none;
          color: inherit;
          transition: all 0.25s;
          display: block;
          position: relative;
          overflow: hidden;
        }

        .card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          opacity: 0;
          transition: opacity 0.25s;
        }

        .card-1::before { background: radial-gradient(circle at 0% 0%, rgba(255,100,120,0.08), transparent 70%); }
        .card-2::before { background: radial-gradient(circle at 0% 0%, rgba(255,159,67,0.08), transparent 70%); }
        .card-3::before { background: radial-gradient(circle at 0% 0%, rgba(100,120,255,0.08), transparent 70%); }

        .card:hover { border-color: rgba(255,255,255,0.12); transform: translateY(-4px); }
        .card:hover::before { opacity: 1; }

        .card-icon { font-size: 28px; margin-bottom: 20px; display: block; }
        .card-num { font-size: 10px; color: #2a2a2a; letter-spacing: 0.15em; margin-bottom: 12px; text-transform: uppercase; }
        .card-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: #f5f0e8; margin-bottom: 10px; }
        .card-desc { font-size: 11px; color: #444; letter-spacing: 0.03em; line-height: 1.9; }
        .card-arrow { font-size: 16px; color: #2a2a2a; margin-top: 20px; display: block; transition: all 0.2s; }
        .card:hover .card-arrow { color: #888; transform: translateX(4px); }

        .hello-world {
          position: relative;
          z-index: 10;
          margin: 0 48px 24px;
          padding: 36px 48px;
          border: 1px solid rgba(255,200,80,0.2);
          border-radius: 16px;
          background: rgba(255,200,80,0.04);
          display: flex;
          align-items: center;
          justify-content: space-between;
          opacity: 0;
          animation: fadeUp 0.7s ease 0.6s forwards;
        }

        .hw-title {
          font-family: 'Syne', sans-serif;
          font-size: 32px;
          font-weight: 800;
          background: linear-gradient(135deg, #ffd700, #ff9f43);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 6px;
        }

        .hw-sub {
          font-size: 11px;
          color: #444;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        footer {
          position: relative;
          z-index: 10;
          padding: 20px 48px;
          border-top: 1px solid rgba(255,255,255,0.04);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .footer-text { font-size: 10px; color: #2a2a2a; letter-spacing: 0.1em; text-transform: uppercase; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          nav { padding: 20px 24px; }
          .nav-links { gap: 16px; }
          .cards { grid-template-columns: 1fr; padding: 24px; }
          .hello-world { margin: 0 24px 24px; padding: 28px 24px; flex-direction: column; gap: 16px; text-align: center; }
          footer { flex-direction: column; gap: 8px; text-align: center; }
          .divider { padding: 0 24px; }
        }
      `}</style>

      <div className="page">
        <div className="bg-gradient" />

        <nav>
          <span className="logo">crackd.</span>
          <div className="nav-links">
            <Link href="/captions" className="nav-link">Vote</Link>
            <Link href="/upload" className="nav-link">Upload</Link>
            <Link href="/protected" className="nav-link">Profile</Link>
            {mounted && (user ? (
              <button onClick={signOut} className="nav-btn">Sign Out</button>
            ) : (
              <button onClick={signIn} className="nav-btn">Sign In →</button>
            ))}
          </div>
        </nav>

        <div className="hero">
          <span className="badge">Maya Jhamb · Columbia University · 2026</span>
          <h1 className="headline">
            <span className="line1">make it</span>
            <span className="line2">crackd.</span>
          </h1>
          <p className="tagline">
            vote on AI-generated captions or upload your own image and watch the machine roast it.
          </p>
          {mounted && user && (
            <div className="user-pill">
              <span className="user-dot" />
              {user.email}
            </div>
          )}
          <div className="cta-group">
            <Link href="/captions" className="cta-primary">Start Voting →</Link>
            <Link href="/upload" className="cta-secondary">Upload an Image</Link>
          </div>
        </div>

        <div className="divider">
          <div className="divider-line" />
          <span className="divider-text">explore</span>
          <div className="divider-line" />
        </div>

        <div className="cards">
          <Link href="/captions" className="card card-1">
            <span className="card-icon">👍</span>
            <p className="card-num">01 — Vote</p>
            <h3 className="card-title">Rate Captions</h3>
            <p className="card-desc">Browse AI-generated captions and cast your vote. Upvote the funny ones, downvote the rest.</p>
            <span className="card-arrow">→</span>
          </Link>

          <Link href="/upload" className="card card-2">
            <span className="card-icon">📸</span>
            <p className="card-num">02 — Generate</p>
            <h3 className="card-title">Upload & Generate</h3>
            <p className="card-desc">Upload any image and let the AI caption pipeline roast it. Results in seconds.</p>
            <span className="card-arrow">→</span>
          </Link>

          <Link href="/protected" className="card card-3">
            <span className="card-icon">🔐</span>
            <p className="card-num">03 — Profile</p>
            <h3 className="card-title">Your Account</h3>
            <p className="card-desc">View your authenticated profile. Protected route — only visible when signed in with Google.</p>
            <span className="card-arrow">→</span>
          </Link>
        </div>

        <div className="hello-world">
          <div>
            <p className="hw-title">Hello, World! 👋</p>
            <p className="hw-sub">Assignment 1 — successfully deployed on Vercel ✓</p>
          </div>
          <span style={{ fontSize: '52px' }}>🌍</span>
        </div>

        <footer>
          <span className="footer-text">© 2026 Maya Jhamb</span>
          <span className="footer-text">Columbia University · 2026</span>
        </footer>
      </div>
    </>
  )
}