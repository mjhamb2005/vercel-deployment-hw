'use client'
import { useEffect, useState, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'

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
      // Step 1: Get presigned URL
      setStatus('Step 1/4: Getting upload URL...')
      const presignRes = await fetch('https://api.almostcrackd.ai/pipeline/generate-presigned-url', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contentType: file.type }),
      })

      if (!presignRes.ok) {
        const err = await presignRes.text()
        throw new Error(`Failed to get presigned URL: ${err}`)
      }

      const { presignedUrl, cdnUrl } = await presignRes.json()

      // Step 2: Upload image to S3
      setStatus('Step 2/4: Uploading image...')
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!uploadRes.ok) throw new Error('Failed to upload image to S3')

      // Step 3: Register image URL
      setStatus('Step 3/4: Registering image...')
      const registerRes = await fetch('https://api.almostcrackd.ai/pipeline/upload-image-from-url', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false }),
      })

      if (!registerRes.ok) {
        const err = await registerRes.text()
        throw new Error(`Failed to register image: ${err}`)
      }

      const { imageId } = await registerRes.json()

      // Step 4: Generate captions
      setStatus('Step 4/4: Generating captions... (this may take a moment)')
      const captionRes = await fetch('https://api.almostcrackd.ai/pipeline/generate-captions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageId }),
      })

      if (!captionRes.ok) {
        const err = await captionRes.text()
        throw new Error(`Failed to generate captions: ${err}`)
      }

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
        minHeight: '100vh', background: '#0a0a0a', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif'
      }}>
        <div style={{ textAlign: 'center', color: '#f5f5f5' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '400', marginBottom: '12px' }}>Upload an Image</h1>
          <p style={{ color: '#666', fontFamily: 'monospace', fontSize: '13px', marginBottom: '24px' }}>
            sign in to upload images and generate captions
          </p>
          <button onClick={signIn} style={{
            background: 'transparent', color: '#f5f5f5', border: '1px solid #444',
            borderRadius: '4px', padding: '10px 28px', cursor: 'pointer',
            fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.1em'
          }}>
            sign in with google →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '48px 16px', fontFamily: 'Georgia, serif' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>

        <h1 style={{ fontSize: '36px', fontWeight: '400', color: '#f5f5f5', marginBottom: '8px', textAlign: 'center' }}>
          Upload & Generate
        </h1>
        <p style={{ textAlign: 'center', color: '#555', fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '48px' }}>
          upload an image → get captions
        </p>

        {/* Upload Area */}
        <div style={{
          border: '1px dashed #333', borderRadius: '8px', padding: '40px',
          textAlign: 'center', marginBottom: '24px', background: '#111',
          cursor: 'pointer', position: 'relative'
        }}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <input
            id="fileInput"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {preview ? (
            <img src={preview} alt="Preview" style={{
              maxHeight: '300px', maxWidth: '100%', objectFit: 'contain',
              borderRadius: '4px', display: 'block', margin: '0 auto'
            }} />
          ) : (
            <>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📸</div>
              <p style={{ color: '#666', fontFamily: 'monospace', fontSize: '13px' }}>
                click to select an image
              </p>
              <p style={{ color: '#444', fontFamily: 'monospace', fontSize: '11px', marginTop: '8px' }}>
                jpg, png, webp, gif, heic
              </p>
            </>
          )}
        </div>

        {file && (
          <p style={{ color: '#555', fontFamily: 'monospace', fontSize: '12px', marginBottom: '16px', textAlign: 'center' }}>
            {file.name}
          </p>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          style={{
            width: '100%', padding: '14px', background: file && !loading ? '#f5f5f5' : '#1a1a1a',
            color: file && !loading ? '#0a0a0a' : '#333', border: 'none',
            borderRadius: '4px', cursor: file && !loading ? 'pointer' : 'not-allowed',
            fontFamily: 'monospace', fontSize: '14px', letterSpacing: '0.1em',
            marginBottom: '24px', fontWeight: 'bold', transition: 'all 0.2s'
          }}
        >
          {loading ? status : 'generate captions →'}
        </button>

        {error && (
          <div style={{
            background: '#1a0000', border: '1px solid #7f1d1d', borderRadius: '4px',
            padding: '16px', marginBottom: '24px', color: '#f87171',
            fontFamily: 'monospace', fontSize: '13px'
          }}>
            ⚠️ {error}
          </div>
        )}

        {captions.length > 0 && (
          <div>
            <p style={{ color: '#555', fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '20px' }}>
              ✓ {captions.length} caption{captions.length !== 1 ? 's' : ''} generated
            </p>
            {captions.map((caption, i) => (
              <div key={i} style={{
                borderTop: '1px solid #1e1e1e', paddingTop: '20px', marginBottom: '20px'
              }}>
                <p style={{ color: '#e0e0e0', fontSize: '20px', fontStyle: 'italic', lineHeight: '1.6' }}>
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