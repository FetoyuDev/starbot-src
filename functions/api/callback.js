export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response(JSON.stringify({ error: 'Código de autorização não fornecido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Faz a troca do code pelo token de acesso do Discord
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    client_secret: env.DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: `${url.origin}/api/callback`
  });

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  const oauthData = await response.json();

  if (!response.ok) {
    return new Response(JSON.stringify({ error: 'Falha ao autenticar no Discord', details: oauthData }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Retorna os dados do token/usuário para o frontend fechar a sessão
  return new Response(JSON.stringify(oauthData), {
    headers: { 'Content-Type': 'application/json' }
  });
}
