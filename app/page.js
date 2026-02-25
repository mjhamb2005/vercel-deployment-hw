'use client'
import { useEffect, useState, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [mounted, setMounted] = useState(false)
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ), [])

  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null))
    function tick() {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { hour12: false }))
      setDate(now.toLocaleDateString('en-US', { weekday: 'long', month: '2-digit', day: '2-digit', year: '2-digit' }).toUpperCase())
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => { subscription.unsubscribe(); clearInterval(iv) }
  }, [])

  async function signIn() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
  }
  async function signOut() { await supabase.auth.signOut(); setUser(null) }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@300;400&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { background: #080810; }

        .page { min-height: 100vh; background: #080810; color: #fff; font-family: 'DM Mono', monospace; overflow-x: hidden; }

        /* shared bg */
        .bg-grid {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-color: #080810;
          background-image:
            repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.018) 40px, rgba(255,255,255,0.018) 41px),
            repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(255,255,255,0.018) 80px, rgba(255,255,255,0.018) 81px);
        }

        /* emoji rain */
        .emoji-field { position: fixed; inset: 0; z-index: 1; overflow: hidden; pointer-events: none; }
        .e { position: absolute; font-size: 56px; opacity: 0; animation: rain linear infinite;
          filter: drop-shadow(0 0 8px rgba(255,220,50,0.4)); }
        .e:nth-child(1)  { left:4%;   animation-duration:10s; animation-delay:0s; }
        .e:nth-child(2)  { left:13%;  animation-duration:13s; animation-delay:3s; }
        .e:nth-child(3)  { left:25%;  animation-duration:9s;  animation-delay:1s; }
        .e:nth-child(4)  { left:38%;  animation-duration:15s; animation-delay:5s; }
        .e:nth-child(5)  { left:52%;  animation-duration:11s; animation-delay:0.5s; }
        .e:nth-child(6)  { left:65%;  animation-duration:12s; animation-delay:4s; }
        .e:nth-child(7)  { left:78%;  animation-duration:8s;  animation-delay:2s; }
        .e:nth-child(8)  { left:90%;  animation-duration:14s; animation-delay:6s; }
        @keyframes rain {
          0%   { transform: translateY(-10vh) rotate(0deg);   opacity: 0; }
          8%   { opacity: 0.28; }
          92%  { opacity: 0.28; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }

        /* glows */
        .glow { position: fixed; border-radius: 50%; pointer-events: none; z-index: 1; }
        .glow-r { width:600px; height:300px; top:20%; left:-8%;
          background: radial-gradient(ellipse, rgba(255,40,70,0.1), transparent 70%);
          animation: gpulse 5s ease-in-out infinite alternate; }
        .glow-b { width:600px; height:300px; top:15%; right:-8%;
          background: radial-gradient(ellipse, rgba(0,200,255,0.08), transparent 70%);
          animation: gpulse 7s ease-in-out infinite alternate-reverse; }
        .glow-y { width:400px; height:400px; bottom:20%; left:35%;
          background: radial-gradient(ellipse, rgba(255,220,0,0.06), transparent 70%);
          animation: gpulse 4s ease-in-out infinite alternate; }
        @keyframes gpulse { from { opacity:0.5; transform:scale(1); } to { opacity:1; transform:scale(1.2); } }

        /* ── NAV ── */
        nav {
          position: sticky; top: 0; z-index: 100;
          display: flex; justify-content: space-between; align-items: center;
          padding: 24px 48px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(8,8,16,0.85); backdrop-filter: blur(16px);
        }
        .logo {
          font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800;
          color: #fff; letter-spacing: -0.02em;
        }
        .nav-links { display: flex; gap: 32px; align-items: center; }
        .nav-link {
          color: rgba(255,255,255,0.4); font-size: 11px; text-decoration: none;
          letter-spacing: 0.15em; text-transform: uppercase; transition: color 0.15s;
        }
        .nav-link:hover { color: #fff; }
        .nav-btn {
          color: rgba(255,255,255,0.4); font-size: 11px; letter-spacing: 0.15em;
          text-transform: uppercase; background: none; border: none;
          cursor: pointer; font-family: 'DM Mono', monospace; transition: color 0.15s;
        }
        .nav-btn:hover { color: #fff; }

        /* ── HERO ── */
        .hero {
          position: relative; z-index: 10;
          min-height: calc(100vh - 73px);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; padding: 80px 24px;
        }
        .neon-laugh {
          display: block; font-family: 'Syne', sans-serif;
          font-size: clamp(64px, 11vw, 130px); font-weight: 800;
          line-height: 0.9; color: #ff3a3a; letter-spacing: 0.04em;
          text-shadow: 0 0 7px #fff, 0 0 21px #fff, 0 0 42px #ff0000, 0 0 82px #ff0000;
          animation: flicker 4s infinite;
        }
        .neon-now {
          display: block; font-family: 'Syne', sans-serif;
          font-size: clamp(64px, 11vw, 130px); font-weight: 800;
          line-height: 0.9; color: #00e5ff; letter-spacing: 0.04em;
          text-shadow: 0 0 7px #fff, 0 0 21px #fff, 0 0 42px #00e5ff, 0 0 82px #00aaff;
          margin-bottom: 36px;
        }
        .neon-face {
          display: inline-block; font-size: 0.85em; vertical-align: middle;
          filter: drop-shadow(0 0 10px rgba(255,220,0,1)) drop-shadow(0 0 30px rgba(255,180,0,0.8));
          animation: glowPulse 2s ease-in-out infinite;
        }
        @keyframes flicker {
          0%,18%,22%,25%,53%,57%,100% { text-shadow:0 0 7px #fff,0 0 21px #fff,0 0 42px #ff0000,0 0 82px #ff0000; }
          20%,24%,55% { text-shadow:none; color:rgba(255,58,58,0.3); }
        }
        @keyframes glowPulse {
          0%,100% { filter:drop-shadow(0 0 8px rgba(255,220,0,1)) drop-shadow(0 0 20px rgba(255,180,0,0.9)); }
          50%      { filter:drop-shadow(0 0 18px rgba(255,220,0,1)) drop-shadow(0 0 45px rgba(255,200,0,1)); }
        }
        .hero-desc {
          font-family: 'Syne', sans-serif; font-size: clamp(15px,1.8vw,20px);
          font-weight: 400; color: rgba(255,255,255,0.55);
          line-height: 1.8; margin-bottom: 40px; max-width: 440px;
        }
        .hero-desc strong { color: rgba(255,255,255,0.9); font-weight: 700; }

        /* ── BUTTONS ── */
        .cta-group { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }
        .cta-primary {
          display: inline-block;
          background: linear-gradient(135deg, #ff6478, #ff9f43);
          color: #fff; text-decoration: none;
          padding: 16px 38px; border-radius: 999px;
          font-family: 'DM Mono', monospace; font-size: 12px;
          letter-spacing: 0.15em; text-transform: uppercase;
          box-shadow: 0 4px 28px rgba(255,100,120,0.45);
          transition: all 0.2s; border: none; cursor: pointer;
        }
        .cta-primary:hover { transform: translateY(-3px); box-shadow: 0 8px 36px rgba(255,100,120,0.6); }
        .cta-secondary {
          display: inline-block;
          background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8);
          text-decoration: none; padding: 16px 38px; border-radius: 999px;
          font-family: 'DM Mono', monospace; font-size: 12px;
          letter-spacing: 0.15em; text-transform: uppercase;
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(6px); transition: all 0.2s;
        }
        .cta-secondary:hover { background: rgba(255,255,255,0.12); transform: translateY(-3px); }

        /* ── CARDS SECTION ── */
        .section {
          position: relative; z-index: 10;
          padding: 80px 48px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .section-label {
          font-size: 10px; color: rgba(255,255,255,0.2);
          letter-spacing: 0.25em; text-transform: uppercase;
          margin-bottom: 40px; display: flex; align-items: center; gap: 16px;
        }
        .section-label::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.06); }

        .cards { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-bottom: 40px; }
        .card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; padding: 32px 28px;
          text-decoration: none; color: inherit; display: block;
          transition: all 0.2s;
        }
        .card:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.14);
          transform: translateY(-3px);
        }
        .card-icon { font-size: 28px; margin-bottom: 20px; display: block; }
        .card-num { font-size: 10px; color: rgba(255,255,255,0.2); letter-spacing: 0.15em; margin-bottom: 12px; text-transform: uppercase; }
        .card-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 10px; }
        .card-desc { font-size: 11px; color: rgba(255,255,255,0.35); line-height: 1.9; }
        .card-arrow { font-size: 13px; color: rgba(255,255,255,0.15); margin-top: 24px; display: block; transition: all 0.2s; }
        .card:hover .card-arrow { color: rgba(255,255,255,0.5); transform: translateX(5px); }

        /* ── HELLO WORLD ── */
        .hello-world {
          position: relative; z-index: 10;
          background: rgba(255,200,0,0.04);
          border: 1px solid rgba(255,200,0,0.15);
          border-radius: 16px; padding: 32px 40px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .hw-title {
          font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800;
          background: linear-gradient(135deg, #ffd700, #ff9f43);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; margin-bottom: 6px;
        }
        .hw-sub { font-size: 10px; color: rgba(255,255,255,0.25); letter-spacing: 0.15em; text-transform: uppercase; }

        /* ── FOOTER ── */
        footer {
          position: relative; z-index: 10;
          padding: 20px 48px; border-top: 1px solid rgba(255,255,255,0.05);
          display: flex; justify-content: space-between; align-items: center;
        }
        .footer-text { font-size: 10px; color: rgba(255,255,255,0.15); letter-spacing: 0.12em; text-transform: uppercase; }

        .clock-bar { text-align: center; margin-top: 48px; }
        .clock-text { font-size: 11px; color: rgba(255,255,255,0.2); letter-spacing: 0.15em; text-transform: uppercase; line-height: 2; }

        @media (max-width: 768px) {
          nav { padding: 20px 24px; }
          .hero { padding: 60px 24px; }
          .section { padding: 48px 24px; }
          .cards { grid-template-columns: 1fr; }
          .hello-world { flex-direction: column; gap: 12px; text-align: center; padding: 28px 24px; }
          footer { flex-direction: column; gap: 8px; text-align: center; padding: 20px 24px; }
        }
      `}</style>

      <div className="page">
        <div className="bg-grid" />
        <div className="emoji-field">
          {['😂','🤣','😂','💀','😂','🤣','😂','💀'].map((e,i) => <span key={i} className="e">{e}</span>)}
        </div>
        <div className="glow glow-r" />
        <div className="glow glow-b" />
        <div className="glow glow-y" />

        <nav>
          <span className="logo">crackd.</span>
          <div className="nav-links">
            <Link href="/captions" className="nav-link">Vote</Link>
            <Link href="/upload" className="nav-link">Upload</Link>
            <Link href="/protected" className="nav-link">Profile</Link>
            {mounted && (user
              ? <button onClick={signOut} className="nav-btn">Sign Out</button>
              : <button onClick={signIn} className="nav-btn">Sign In →</button>
            )}
          </div>
        </nav>

        <div className="hero">
          <span className="neon-laugh">LAUGH</span>
          <span className="neon-now">NOW <span className="neon-face">😂</span></span>
          <p className="hero-desc">
            Upload a photo. Get roasted by AI.<br />
            Vote on who said it best.<br />
            <strong>Meme culture, engineered.</strong>
          </p>
          <div className="cta-group">
            <Link href="/captions" className="cta-primary">↳ Start Voting</Link>
            <Link href="/upload" className="cta-secondary">Upload an Image</Link>
          </div>
          {mounted && <div className="clock-bar">
            <p className="clock-text">{time} · NEW YORK, NY · {date}</p>
            {user && <p className="clock-text">✓ {user.email}</p>}
          </div>}
        </div>

        <div className="section">
          <div className="section-label">Explore</div>
          <div className="cards">
            <Link href="/captions" className="card">
              <span className="card-icon">👍</span>
              <p className="card-num">01 — Vote</p>
              <h3 className="card-title">Rate Captions</h3>
              <p className="card-desc">Browse AI-generated captions and cast your vote. Upvote the funny ones, downvote the rest.</p>
              <span className="card-arrow">→</span>
            </Link>
            <Link href="/upload" className="card">
              <span className="card-icon">📸</span>
              <p className="card-num">02 — Generate</p>
              <h3 className="card-title">Upload & Generate</h3>
              <p className="card-desc">Upload any image and let the AI caption pipeline do its thing. Results in seconds.</p>
              <span className="card-arrow">→</span>
            </Link>
            <Link href="/protected" className="card">
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
            <span style={{ fontSize: '44px' }}>🌍</span>
          </div>
        </div>

        <footer>
          <span className="footer-text">© 2026 Maya Jhamb</span>
          <span className="footer-text">Columbia University · 2026</span>
        </footer>
      </div>
    </>
  )
}