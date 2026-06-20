// LinkedIn OAuth (OpenID Connect) + posting helpers.
//
// Scopes used: "openid profile" (for sign-in / userinfo) and "w_member_social"
// (to publish posts on the member's behalf). Posting goes through the v2/ugcPosts
// API: images must be registered + uploaded via the Assets API first to obtain a
// digitalmediaAsset URN, which is then referenced in the post body. Multiple
// images in one ugcPost render as a native multi-image ("carousel") post.

const OAUTH_BASE = "https://www.linkedin.com/oauth/v2"
const API_BASE = "https://api.linkedin.com"

export const LINKEDIN_SCOPES = "openid profile w_member_social"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

export function buildLinkedInAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: requireEnv("LINKEDIN_CLIENT_ID"),
    redirect_uri: requireEnv("LINKEDIN_REDIRECT_URI"),
    state,
    scope: LINKEDIN_SCOPES,
  })
  return `${OAUTH_BASE}/authorization?${params.toString()}`
}

export interface LinkedInToken {
  accessToken: string
  /** Lifetime in seconds from now. */
  expiresIn: number
  /** Only returned for apps approved for refresh tokens; null otherwise. */
  refreshToken: string | null
  scope: string
}

export async function exchangeCodeForToken(code: string): Promise<LinkedInToken> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: requireEnv("LINKEDIN_REDIRECT_URI"),
    client_id: requireEnv("LINKEDIN_CLIENT_ID"),
    client_secret: requireEnv("LINKEDIN_CLIENT_SECRET"),
  })

  const res = await fetch(`${OAUTH_BASE}/accessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`LinkedIn token exchange failed (${res.status}): ${detail}`)
  }

  const data = (await res.json()) as {
    access_token: string
    expires_in: number
    refresh_token?: string
    scope: string
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token ?? null,
    scope: data.scope,
  }
}

export interface LinkedInProfile {
  /** LinkedIn's stable member id from the OpenID `sub` claim. */
  sub: string
  name: string | null
  picture: string | null
  email: string | null
}

export async function getLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  const res = await fetch(`${API_BASE}/v2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`LinkedIn userinfo failed (${res.status}): ${detail}`)
  }

  const data = (await res.json()) as {
    sub: string
    name?: string
    picture?: string
    email?: string
  }

  return {
    sub: data.sub,
    name: data.name ?? null,
    picture: data.picture ?? null,
    email: data.email ?? null,
  }
}

// ── Posting ──────────────────────────────────────────────────────────────

interface RegisteredUpload {
  uploadUrl: string
  /** urn:li:digitalmediaAsset:... */
  asset: string
}

// Step 1 of an image post: ask LinkedIn for an upload URL + asset URN.
async function registerImageUpload(
  accessToken: string,
  ownerUrn: string,
): Promise<RegisteredUpload> {
  const res = await fetch(`${API_BASE}/v2/assets?action=registerUpload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: ownerUrn,
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          },
        ],
      },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`LinkedIn registerUpload failed (${res.status}): ${detail}`)
  }

  const data = (await res.json()) as {
    value: {
      asset: string
      uploadMechanism: {
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": {
          uploadUrl: string
        }
      }
    }
  }

  return {
    uploadUrl:
      data.value.uploadMechanism[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ].uploadUrl,
    asset: data.value.asset,
  }
}

// Step 2: fetch the source image bytes and PUT them to the upload URL.
async function uploadImageBytes(
  uploadUrl: string,
  accessToken: string,
  imageUrl: string,
): Promise<void> {
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) throw new Error(`Failed to fetch image for upload: ${imageUrl}`)
  const bytes = Buffer.from(await imgRes.arrayBuffer())
  const contentType = imgRes.headers.get("content-type") ?? "image/png"

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: bytes,
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`LinkedIn image upload failed (${res.status}): ${detail}`)
  }
}

export interface LinkedInPostResult {
  /** The ugcPost / share URN, e.g. urn:li:share:123. */
  id: string
  /** A web URL to the published post. */
  postUrl: string
}

export async function postToLinkedIn(
  accessToken: string,
  linkedinSub: string,
  text: string,
  imageUrls: string[],
): Promise<LinkedInPostResult> {
  const author = `urn:li:person:${linkedinSub}`

  // Upload every image first, collecting their asset URNs (sequentially so a
  // failure surfaces clearly and we don't hammer the Assets API).
  const media: Array<{ status: "READY"; media: string }> = []
  for (const imageUrl of imageUrls) {
    const { uploadUrl, asset } = await registerImageUpload(accessToken, author)
    await uploadImageBytes(uploadUrl, accessToken, imageUrl)
    media.push({ status: "READY", media: asset })
  }

  const shareMediaCategory = media.length > 0 ? "IMAGE" : "NONE"

  const res = await fetch(`${API_BASE}/v2/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory,
          ...(media.length > 0 ? { media } : {}),
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`LinkedIn post failed (${res.status}): ${detail}`)
  }

  // The created URN comes back in the x-restli-id header (and the body `id`).
  const data = (await res.json().catch(() => ({}))) as { id?: string }
  const id = res.headers.get("x-restli-id") ?? data.id ?? ""

  return {
    id,
    postUrl: id ? `https://www.linkedin.com/feed/update/${id}/` : "https://www.linkedin.com/feed/",
  }
}
