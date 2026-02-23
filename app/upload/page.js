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
      setUser(session?.user ?? null)
      setToken(session?.access_token ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setToken(session?.access_token ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  function handleFileChange(e) {
    const selected = e.target.files[0]
    if (!selected) return
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    setCaptions([])
    setError('')
    setStatus('')
  }

  async function handleUpload() {
    if (!file || !token) return
    setLoading(true)
    setError('')
    setCaptions([])

    try {
      setStatus('Step 1/4: Getting upload URL...')
      const presignRes = await fetch('https://api.almostcrackd.ai/pipeline/generate-presigned-url', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: file.type }),
      })
      if (!presignRes.ok) throw new Error(`Failed to get presigned URL: ${await presignRes.text()}`)
      const { presignedUrl, cdnUrl } = await presignRes.json()

      setStatus('Step 2/4: Uploading image...')
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!uploadRes.ok) throw new Error('Failed to upload image to S3')

      setStatus('Step 3/4: Registering image...')
      const registerRes = await fetch('https://api.almostcrackd.ai/pipeline/upload-image-from-url', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false }),
      })
      if (!registerRes.ok) throw new Error(`Failed to register image: ${await registerRes.text()}`)
      const { imageId } = await registerRes.json()

      setStatus('Step 4/4: Generating captions...')
      const captionRes = await fetch('https://api.almostcrackd.ai/pipeline/generate-captions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId }),
      })
      if (!captionRes.ok) throw new Error(`Failed to generate captions: ${await captionRes.text()}`)

      const captionData = await captionRes.json()
      setCaptions(Array.isArray(captionData) ? captionData : [captionData])
      setStatus('Done!')
    } catch (e) {
      setError(e.message)
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@300;400&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #ffffff; }

        .page { min-height: 100vh; background: #fff; color: #111; font-family: 'DM Mono', monospace; }

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

        .content { max-width: 580px; margin: 0 auto; padding: 64px 24px 80px; }

        .page-title {
          font-family: 'Syne', sans-serif; font-size: clamp(32px, 5vw, 56px);
          font-weight: 800; color: #111; letter-spacing: -0.04em;
          margin-bottom: 8px; text-align: center; line-height: 1;
        }

        .page-sub {
          text-align: center; color: #bbb; font-size: 11px;
          letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 48px;
        }

        .sign-in-box {
          text-align: center; padding: 64px 32px;
          border: 1px solid #f0f0f0; border-radius: 20px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.04);
        }

        .sign-in-title {
          font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800;
          color: #111; margin-bottom: 10px;
        }

        .sign-in-sub { color: #aaa; font-size: 12px; line-height: 2; margin-bottom: 28px; }

        .sign-in-btn-lg {
          background: #111; color: #fff; border: none;
          border-radius: 999px; padding: 14px 32px; cursor: pointer;
          font-family: 'DM Mono', monospace; font-size: 12px;
          letter-spacing: 0.1em; transition: background 0.15s;
        }
        .sign-in-btn-lg:hover { background: #333; }

        .back-link {
          display: block; text-align: center; margin-top: 16px;
          color: #ccc; font-size: 11px; text-decoration: none;
          letter-spacing: 0.06em; transition: color 0.15s;
        }
        .back-link:hover { color: #999; }

        .user-tag {
          display: flex; align-items: center; justify-content: center;
          gap: 6px; font-size: 11px; color: #bbb; margin-bottom: 32px;
        }
        .user-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; }

        .upload-area {
          border: 1.5px dashed #e8e8e8; border-radius: 16px;
          padding: 48px 32px; text-align: center; margin-bottom: 12px;
          background: #fafafa; cursor: pointer; transition: all 0.15s;
        }
        .upload-area:hover { border-color: #ccc; background: #f5f5f5; }

        .upload-icon { font-size: 36px; margin-bottom: 14px; }
        .upload-hint { color: #aaa; font-size: 12px; margin-bottom: 6px; }
        .upload-types { color: #ccc; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; }

        .file-name { color: #ccc; font-size: 11px; margin-bottom: 16px; text-align: center; }

        .generate-btn {
          width: 100%; padding: 15px;
          background: linear-gradient(135deg, #ff6478, #ff9f43);
          color: #fff; border: none; border-radius: 999px;
          font-family: 'DM Mono', monospace; font-size: 12px;
          letter-spacing: 0.1em; margin-bottom: 24px;
          transition: opacity 0.15s; cursor: pointer;
          box-shadow: 0 4px 20px rgba(255,100,120,0.2);
        }
        .generate-btn:disabled {
          background: #f0f0f0; color: #ccc; cursor: not-allowed;
          box-shadow: none;
        }
        .generate-btn:not(:disabled):hover { opacity: 0.88; }

        .error-box {
          background: #fff5f5; border: 1px solid #fee2e2;
          border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;
          color: #dc2626; font-size: 12px; line-height: 1.8;
        }

        .captions-label {
          color: #bbb; font-size: 11px; letter-spacing: 0.12em;
          text-transform: uppercase; margin-bottom: 14px; text-align: center;
        }

        .caption-card {
          background: #fff; border-radius: 14px; padding: 22px 26px;
          margin-bottom: 10px; border: 1px solid #f0f0f0;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }

        .caption-text {
          font-family: 'Syne', sans-serif; color: #111;
          font-size: 17px; font-style: italic; line-height: 1.6; font-weight: 600;
        }

        @media (max-width: 768px) {
          nav { padding: 0 20px; }
          .content { padding: 40px 16px 60px; }
        }
      `}</style>

      <div className="page">
        <nav>
          <Link href="/" className="logo">crackd.</Link>
          <div className="nav-right">
            <Link href="/captions" className="nav-link">Vote</Link>
            <Link href="/protected" className="nav-link">Profile</Link>
            {user ? (
              <button onClick={() => supabase.auth.signOut()} className="nav-btn-out">Sign Out</button>
            ) : (
              <button onClick={signIn} className="nav-btn-in">Sign In →</button>
            )}
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
              <div className="user-tag">
                <span className="user-dot" />
                {user.email}
              </div>

              <div
                className="upload-area"
                onClick={() => document.getElementById('fileInput').click()}
              >
                <input
                  id="fileInput"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                {preview ? (
                  <img src={preview} alt="Preview" style={{
                    maxHeight: '320px', maxWidth: '100%', objectFit: 'contain',
                    borderRadius: '8px', display: 'block', margin: '0 auto'
                  }} />
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
                  {captions.map((caption, i) => (
                    <div key={i} className="caption-card">
                      <p className="caption-text">"{caption.content ?? caption}"</p>
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