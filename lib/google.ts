const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

function buildRedirectUri(baseUrl: string) {
  return `${baseUrl.replace(/\/$/, "")}/api/auth/google/callback`;
}

export function getGoogleAuthUrl(state: string, baseUrl: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: buildRedirectUri(baseUrl),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCodeForTokens(
  code: string,
  baseUrl: string
): Promise<{ access_token?: string; error?: string }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: buildRedirectUri(baseUrl),
      grant_type: "authorization_code",
      code,
    }),
  });
  return res.json();
}

export type GoogleUser = {
  sub: string;
  name: string;
  email: string;
  email_verified: boolean | string; // Google can return boolean or string
};

export async function getGoogleUser(accessToken: string): Promise<GoogleUser> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}
