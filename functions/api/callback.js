export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Código de autorização ausente.', { status: 400 });
  }

  // Troca o código pelo token usando o secret salvo no Cloudflare
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    client_secret: env.DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: `${url.origin}/api/callback`,
  });

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const oauthData = await response.json();

  if (!response.ok) {
    return new Response(JSON.stringify(oauthData), { 
      status: response.status,
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  // Aqui você tem o access_token para pegar dados do usuário no Discord
  return new Response(JSON.stringify(oauthData), {
    headers: { 'Content-Type': 'application/json' },
  });
}
