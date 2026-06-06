import { Worker, Job } from 'bullmq'

const connection = {
  url: process.env.REDIS_URL!,
}

export const ideaWorker = new Worker(
  'ideas',
  async (job: Job) => {
    // Placeholder — idea generation worker
    console.log(`Processing job ${job.id}:`, job.name)
  },
  { connection }
)

ideaWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`)
})

ideaWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err)
})
