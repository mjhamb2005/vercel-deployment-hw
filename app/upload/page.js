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

      setStatus('Step 4/4: Generating captions... (this may take a moment)')
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

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh', background: '#faf8f5',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Georgia, serif'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '380px', padding: '48px 24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '400', color: '#1a1a1a', marginBottom: '12px' }}>
            Upload & Generate
          </h1>
          <p style={{ color: '#aaa', fontFamily: 'monospace', fontSize: '12px', marginBottom: '32px', lineHeight: '1.9' }}>
            sign in to upload images and generate AI captions
          </p>
          <button onClick={signIn} style={{
            background: '#1a1a1a', color: '#faf8f5', border: 'none',
            borderRadius: '999px', padding: '12px 32px', cursor: 'pointer',
            fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.08em'
          }}>
            sign in with google →
          </button>
          <div style={{ marginTop: '20px' }}>
            <Link href="/" style={{ color: '#ccc', fontFamily: 'monospace', fontSize: '11px', textDecoration: 'none' }}>
              ← back home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5', fontFamily: 'Georgia, serif' }}>
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px', borderBottom: '1px solid #ede8e1', background: '#faf8f5'
      }}>
        <Link href="/" style={{
          fontFamily: 'monospace', fontSize: '13px', color: '#1a1a1a',
          textDecoration: 'none', letterSpacing: '0.05em'
        }}>
          ← crackd.
        </Link>
        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#bbb' }}>
          ✓ {user.email}
        </span>
      </nav>

      <div style={{ maxWidth: '620px', margin: '0 auto', padding: '56px 24px' }}>
        <h1 style={{
          fontSize: '38px', fontWeight: '400', color: '#1a1a1a',
          marginBottom: '8px', textAlign: 'center', letterSpacing: '-0.02em'
        }}>
          Upload & Generate
        </h1>
        <p style={{
          textAlign: 'center', color: '#bbb', fontFamily: 'monospace',
          fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '48px'
        }}>
          upload an image → get ai captions
        </p>

        <div
          onClick={() => document.getElementById('fileInput').click()}
          style={{
            border: '2px dashed #e0d8ce', borderRadius: '16px', padding: '48px 32px',
            textAlign: 'center', marginBottom: '16px', background: '#fff',
            cursor: 'pointer', boxShadow: '0 2px 20px rgba(0,0,0,0.04)'
          }}
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
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>📸</div>
              <p style={{ color: '#bbb', fontFamily: 'monospace', fontSize: '12px', marginBottom: '6px' }}>
                click to select an image
              </p>
              <p style={{ color: '#d0cbc5', fontFamily: 'monospace', fontSize: '10px' }}>
                jpg · png · webp · gif
              </p>
            </>
          )}
        </div>

        {file && (
          <p style={{ color: '#ccc', fontFamily: 'monospace', fontSize: '11px', marginBottom: '16px', textAlign: 'center' }}>
            {file.name}
          </p>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          style={{
            width: '100%', padding: '15px',
            background: file && !loading ? '#1a1a1a' : '#ede8e1',
            color: file && !loading ? '#faf8f5' : '#ccc',
            border: 'none', borderRadius: '999px',
            cursor: file && !loading ? 'pointer' : 'not-allowed',
            fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.1em',
            marginBottom: '24px', transition: 'all 0.2s'
          }}
        >
          {loading ? status : 'generate captions →'}
        </button>

        {error && (
          <div style={{
            background: '#fff5f5', border: '1px solid #fcd5d5', borderRadius: '12px',
            padding: '16px 20px', marginBottom: '24px', color: '#e57373',
            fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.8'
          }}>
            ⚠️ {error}
          </div>
        )}

        {captions.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <p style={{
              color: '#bbb', fontFamily: 'monospace', fontSize: '11px',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              marginBottom: '20px', textAlign: 'center'
            }}>
              ✓ {captions.length} caption{captions.length !== 1 ? 's' : ''} generated
            </p>
            {captions.map((caption, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: '12px', padding: '24px 28px',
                marginBottom: '12px', border: '1px solid #ede8e1',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
              }}>
                <p style={{ color: '#1a1a1a', fontSize: '18px', fontStyle: 'italic', lineHeight: '1.7' }}>
                  "{caption.content ?? caption}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}