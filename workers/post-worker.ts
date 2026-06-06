import { Worker, Job } from 'bullmq'

const connection = {
  url: process.env.REDIS_URL!,
}

export const postWorker = new Worker(
  'posts',
  async (job: Job) => {
    // Placeholder — post generation worker (caption/image/carousel)
    console.log(`Processing job ${job.id}:`, job.name)
  },
  { connection }
)

postWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`)
})

postWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err)
})
