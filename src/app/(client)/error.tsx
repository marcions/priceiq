'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h2 style={{ color: 'red', marginBottom: '1rem' }}>Erro no servidor (debug)</h2>
      <pre style={{ color: 'red', whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#fee', padding: '1rem', borderRadius: 4 }}>
        {error.message}
        {'\n\n'}
        {error.stack}
        {error.digest ? `\n\ndigest: ${error.digest}` : ''}
      </pre>
      <button onClick={reset} style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>
        Tentar novamente
      </button>
    </div>
  )
}
