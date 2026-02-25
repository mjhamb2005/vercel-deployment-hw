'use client'
import { useEffect, useState, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

export default function UploadPage() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [status, setStatus] = useState('')
  const [captions, setCaptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ), [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null); setToken(session?.access_token ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null); setToken(session?.access_token ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signIn() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
  }

  function handleFileChange(e) {
    const f = e.target.files[0]; if (!f) return
    setFile(f); setPreview(URL.createObjectURL(f)); setCaptions([]); setError(''); setStatus('')
  }

  async function handleUpload() {
    if (!file || !token) return
    setLoading(true); setError(''); setCaptions([])
    try {
      setStatus('Step 1/4: Getting upload URL...')
      const r1 = await fetch('https://api.almostcrackd.ai/pipeline/generate-presigned-url', {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: file.type }),
      })
      if (!r1.ok) throw new Error(`Failed to get presigned URL: ${await r1.text()}`)
      const { presignedUrl, cdnUrl } = await r1.json()

      setStatus('Step 2/4: Uploading image...')
      const r2 = await fetch(presignedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      if (!r2.ok) throw new Error('Failed to upload image')

      setStatus('Step 3/4: Registering image...')
      const r3 = await fetch('https://api.almostcrackd.ai/pipeline/upload-image-from-url', {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false }),
      })
      if (!r3.ok) throw new Error(`Failed to register: ${await r3.text()}`)
      const { imageId } = await r3.json()

      setStatus('Step 4/4: Generating captions...')
      const r4 = await fetch('https://api.almostcrackd.ai/pipeline/generate-captions', {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId }),
      })
      if (!r4.ok) throw new Error(`Failed to generate: ${await r4.text()}`)
      const data = await r4.json()
      setCaptions(Array.isArray(data) ? data : [data]); setStatus('Done!')
    } catch (e) { setError(e.message); setStatus('') }
    finally { setLoading(false) }
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
        .e:nth-child(1)  { left:7%;   animation-duration:11s; animation-delay:1s; }
        .e:nth-child(2)  { left:22%;  animation-duration:14s; animation-delay:4s; }
        .e:nth-child(3)  { left:48%;  animation-duration:9s;  animation-delay:0s; }
        .e:nth-child(4)  { left:68%;  animation-duration:12s; animation-delay:3s; }
        .e:nth-child(5)  { left:85%;  animation-duration:10s; animation-delay:2s; }
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

        .content { max-width: 600px; margin: 0 auto; padding: 64px 24px 80px; position: relative; z-index: 10; }

        .page-title {
          font-family: 'Syne', sans-serif; font-size: clamp(32px,5vw,60px);
          font-weight: 800; letter-spacing: -0.04em; line-height: 1;
          margin-bottom: 8px; text-align: center;
          background: linear-gradient(135deg, #ff6478, #ff9f43, #ffd700);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .page-sub {
          text-align: center; color: rgba(255,255,255,0.25); font-size: 11px;
          letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 48px;
        }

        .sign-in-box {
          text-align: center; padding: 64px 32px;
          border: 1px solid rgba(255,255,255,0.07); border-radius: 20px;
          background: rgba(255,255,255,0.02);
        }
        .sign-in-title { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: #fff; margin-bottom: 10px; }
        .sign-in-sub { color: rgba(255,255,255,0.3); font-size: 12px; line-height: 2; margin-bottom: 28px; }
        .sign-in-btn-lg {
          background: linear-gradient(135deg, #ff6478, #ff9f43);
          color: #fff; border: none; border-radius: 999px;
          padding: 14px 32px; cursor: pointer; font-family: 'DM Mono', monospace;
          font-size: 12px; letter-spacing: 0.1em; transition: opacity 0.15s;
          box-shadow: 0 4px 24px rgba(255,100,120,0.35);
        }
        .sign-in-btn-lg:hover { opacity: 0.88; }
        .back-link {
          display: block; text-align: center; margin-top: 16px;
          color: rgba(255,255,255,0.2); font-size: 11px; text-decoration: none;
          letter-spacing: 0.06em; transition: color 0.15s;
        }
        .back-link:hover { color: rgba(255,255,255,0.5); }

        .user-tag { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11px; color: rgba(255,255,255,0.3); margin-bottom: 32px; }
        .user-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; }

        .upload-area {
          border: 1.5px dashed rgba(255,255,255,0.1); border-radius: 16px;
          padding: 48px 32px; text-align: center; margin-bottom: 12px;
          background: rgba(255,255,255,0.02); cursor: pointer; transition: all 0.15s;
        }
        .upload-area:hover { border-color: rgba(255,255,255,0.22); background: rgba(255,255,255,0.04); }
        .upload-icon { font-size: 40px; margin-bottom: 14px; }
        .upload-hint { color: rgba(255,255,255,0.3); font-size: 12px; margin-bottom: 6px; }
        .upload-types { color: rgba(255,255,255,0.15); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; }
        .file-name { color: rgba(255,255,255,0.2); font-size: 11px; margin-bottom: 16px; text-align: center; }

        .generate-btn {
          width: 100%; padding: 16px;
          background: linear-gradient(135deg, #ff6478, #ff9f43);
          color: #fff; border: none; border-radius: 999px;
          font-family: 'DM Mono', monospace; font-size: 12px; letter-spacing: 0.12em;
          margin-bottom: 24px; transition: all 0.15s; cursor: pointer;
          box-shadow: 0 4px 24px rgba(255,100,120,0.3);
        }
        .generate-btn:disabled { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.2); cursor: not-allowed; box-shadow: none; }
        .generate-btn:not(:disabled):hover { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 6px 32px rgba(255,100,120,0.45); }

        .error-box {
          background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2);
          border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;
          color: #f87171; font-size: 12px; line-height: 1.8;
        }

        .captions-label { color: rgba(255,255,255,0.2); font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 14px; text-align: center; }

        .caption-card {
          background: rgba(255,255,255,0.03); border-radius: 14px; padding: 22px 26px;
          margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.07);
        }
        .caption-text { font-family: 'Syne', sans-serif; color: rgba(255,255,255,0.85); font-size: 17px; font-style: italic; line-height: 1.6; font-weight: 600; }

        @media (max-width: 768px) {
          nav { padding: 16px 20px; }
          .content { padding: 40px 16px 60px; }
        }
      `}</style>

      <div className="page">
        <div className="bg-grid" />
        <div className="emoji-field">
          {['📸','😂','🤣','💀','😂'].map((e,i) => <span key={i} className="e">{e}</span>)}
        </div>
        <div className="glow glow-r" />
        <div className="glow glow-b" />

        <nav>
          <Link href="/" className="logo">crackd.</Link>
          <div className="nav-links">
            <Link href="/captions" className="nav-link">Vote</Link>
            <Link href="/protected" className="nav-link">Profile</Link>
            {user
              ? <button onClick={() => supabase.auth.signOut()} className="nav-btn">Sign Out</button>
              : <button onClick={signIn} className="nav-btn">Sign In →</button>
            }
          </div>
        </nav>

        <div className="content">
          <h1 className="page-title">Upload & Generate</h1>
          <p className="page-sub">upload an image → get ai captions</p>

          {!user ? (
            <div className="sign-in-box">
              <p className="sign-in-title">Sign in to continue</p>
              <p className="sign-in-sub">You need to be signed in to upload images and generate captions.</p>
              <button onClick={signIn} className="sign-in-btn-lg">sign in with google →</button>
              <Link href="/" className="back-link">← back home</Link>
            </div>
          ) : (
            <>
              <div className="user-tag"><span className="user-dot" />{user.email}</div>

              <div className="upload-area" onClick={() => document.getElementById('fi').click()}>
                <input id="fi" type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleFileChange} style={{ display: 'none' }} />
                {preview ? (
                  <img src={preview} alt="Preview" style={{ maxHeight: '320px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', display: 'block', margin: '0 auto' }} />
                ) : (
                  <>
                    <div className="upload-icon">📸</div>
                    <p className="upload-hint">click to select an image</p>
                    <p className="upload-types">jpg · png · webp · gif</p>
                  </>
                )}
              </div>

              {file && <p className="file-name">{file.name}</p>}

              <button onClick={handleUpload} disabled={!file || loading} className="generate-btn">
                {loading ? status : 'generate captions →'}
              </button>

              {error && <div className="error-box">⚠️ {error}</div>}

              {captions.length > 0 && (
                <div>
                  <p className="captions-label">✓ {captions.length} caption{captions.length !== 1 ? 's' : ''} generated</p>
                  {captions.map((c, i) => (
                    <div key={i} className="caption-card">
                      <p className="caption-text">"{c.content ?? c}"</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}