// lib/engage/recentComments.ts — the person's last few comments of one kind,
// shown to the model (recentCommentsSection in lib/ai/prompts/commentPrompt)
// so a new comment doesn't open or run like the ones before it. Each comment
// can read fine on its own; twenty in a row that all start "I'd push back..."
// are what makes an account look automated.
//
// Never in the way: a failed lookup means writing without them, not failing.
import { db } from "@/lib/db"

export const RECENT_COMMENTS = 5

// kind: CommentHistory.kind ("comment", "reply", "x_reply").
export async function recentComments(userId: string, kind: string): Promise<string[]> {
  try {
    const rows = await db.commentHistory.findMany({
      where: { userId, kind },
      orderBy: { createdAt: "desc" },
      take: RECENT_COMMENTS,
      select: { comment: true },
    })
    return rows.map((row) => row.comment.trim()).filter(Boolean)
  } catch (err) {
    console.warn("[recentComments] lookup failed, writing without them:", err)
    return []
  }
}
