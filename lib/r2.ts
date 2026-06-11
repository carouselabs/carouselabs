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
  const buffer = Buffer.from(base64, "base64")

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: filename,
      Body: buffer,
      ContentType: contentType,
    }),
  )

  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${filename}`
}
