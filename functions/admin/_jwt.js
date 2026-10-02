// ============================================
// Helper JWT — verifica e decodifica tokens HMAC-SHA256
// Usado por /admin/_middleware.js pra validar sessões
// ============================================

// Verifica um JWT e retorna o payload se válido, ou null se inválido/expirado
export async function verifyJWT(token, secret) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sigB64] = parts;
  const data = `${headerB64}.${payloadB64}`;

  try {
    // Importa chave secreta
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    // Decodifica assinatura base64url
    const sigBytes = b64urlToBytes(sigB64);

    // Verifica assinatura (timing-safe)
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
    if (!isValid) return null;

    // Decodifica payload
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

    // Verifica expiração
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null;
    }

    return payload;
  } catch (err) {
    console.error('[verifyJWT] Erro:', err.message);
    return null;
  }
}

// Helper: base64url → Uint8Array
function b64urlToBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
