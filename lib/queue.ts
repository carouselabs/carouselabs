import { Queue } from 'bullmq'

const connection = {
  url: process.env.REDIS_URL!,
}

export const ideaQueue = new Queue('ideas', { connection })
export const postQueue = new Queue('posts', { connection })

export async function enqueueIdeaGeneration(userId: string, payload: unknown) {
  return ideaQueue.add('generate', { userId, ...payload as object }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  })
}

export async function enqueuePostGeneration(userId: string, postId: string, payload: unknown) {
  return postQueue.add('generate', { userId, postId, ...payload as object }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  })
}
