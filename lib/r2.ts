import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

export async function uploadToR2(
  base64: string,
  filename: string,
  contentType = "image/png",
): Promise<string> {
  console.log("[r2] Starting upload:", filename)
  console.log("[r2] Account ID:", process.env.CLOUDFLARE_R2_ACCOUNT_ID)
  console.log("[r2] Bucket:", process.env.CLOUDFLARE_R2_BUCKET_NAME)
  console.log("[r2] Public URL:", process.env.CLOUDFLARE_R2_PUBLIC_URL)
  console.log("[r2] Access Key exists:", !!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID)
  console.log("[r2] Secret Key exists:", !!process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY)

  try {
    const buffer = Buffer.from(base64, "base64")
    console.log("[r2] Buffer size:", buffer.length)

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
        Key: filename,
        Body: buffer,
        ContentType: contentType,
      }),
    )

    const url = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${filename}`
    console.log("[r2] Upload success:", url)
    return url
  } catch (err) {
    console.error("[r2] Upload failed:", err)
    throw err
  }
}
