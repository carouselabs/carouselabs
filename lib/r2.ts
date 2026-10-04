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
  console.log("[r2] Starting upload", {
    configured: Boolean(process.env.CLOUDFLARE_R2_ACCOUNT_ID && process.env.CLOUDFLARE_R2_BUCKET_NAME &&
      process.env.CLOUDFLARE_R2_PUBLIC_URL && process.env.CLOUDFLARE_R2_ACCESS_KEY_ID && process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY),
    contentType,
  })

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
    console.log("[r2] Upload succeeded")
    return url
  } catch (err) {
    const metadata = err && typeof err === "object" && "$metadata" in err ? err.$metadata : null
    const status = metadata && typeof metadata === "object" && "httpStatusCode" in metadata ? metadata.httpStatusCode : null
    console.error("[r2] Upload failed", { status: typeof status === "number" ? status : null })
    // SDK error bodies can include object paths and signed requests.
    throw new Error("Image storage upload failed")
  }
}
