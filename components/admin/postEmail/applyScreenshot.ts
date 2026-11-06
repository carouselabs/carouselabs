// "Fill from screenshot": what the AI read off a screenshot of a LinkedIn post
// (lib/ai/postEmailAi.ts), put into the email. Only what it found is filled
// in: anything it couldn't see keeps what the admin had. The banner, the
// post's link and the admin's own words are never touched.
import type { Picture, PostEmail } from "@/lib/postEmail"
import type { ScreenshotRead } from "@/lib/ai/postEmailAi"

export type ScreenshotPictures = { authorPhoto: Picture | null; media: Picture | null; commentPhoto: Picture | null; repostPhoto: Picture | null }

const or = (found: string, had: string) => found || had

export function applyScreenshot(email: PostEmail, read: ScreenshotRead, pictures: ScreenshotPictures): PostEmail {
  const p = email.post
  const media = pictures.media
  const type = read.type
  const options = read.poll.options.length >= 2 ? read.poll.options : p.poll.options
  return {
    ...email,
    post: {
      ...p,
      type,
      author: {
        ...p.author,
        name: or(read.author.name, p.author.name),
        bio: or(read.author.bio, p.author.bio),
        followers: or(read.author.followers, p.author.followers),
        time: or(read.author.time, p.author.time),
        photo: pictures.authorPhoto ?? p.author.photo,
      },
      caption: or(read.caption, p.caption),
      counts: {
        reactions: or(read.counts.reactions, p.counts.reactions),
        comments: or(read.counts.comments, p.counts.comments),
        reposts: or(read.counts.reposts, p.counts.reposts),
      },
      image: type === "image" && media ? media : p.image,
      photos: {
        items: type === "photos" && media && p.photos.items.length === 0 ? [media] : p.photos.items,
        total: read.photosTotal || p.photos.total,
      },
      slides: {
        ...p.slides,
        title: or(read.slides.title, p.slides.title),
        pages: read.slides.pages || p.slides.pages,
        items: type === "slideshow" && media && p.slides.items.length === 0 ? [media] : p.slides.items,
      },
      video: { cover: type === "video" && media ? media : p.video.cover, duration: or(read.videoDuration, p.video.duration) },
      poll: {
        ...p.poll,
        question: or(read.poll.question, p.poll.question),
        options,
        votes: or(read.poll.votes, p.poll.votes),
        timeLeft: or(read.poll.timeLeft, p.poll.timeLeft),
        showResults: read.poll.options.length >= 2 ? read.poll.options.some((o) => o.percent > 0) : p.poll.showResults,
      },
      article: {
        cover: type === "article" && media ? media : p.article.cover,
        title: or(read.article.title, p.article.title),
        source: or(read.article.source, p.article.source),
        readTime: or(read.article.readTime, p.article.readTime),
        blurb: or(read.article.blurb, p.article.blurb),
      },
      link: { picture: type === "link" && media ? media : p.link.picture, title: or(read.link.title, p.link.title), domain: or(read.link.domain, p.link.domain) },
      repost: {
        author: {
          name: or(read.repost.name, p.repost.author.name),
          bio: or(read.repost.bio, p.repost.author.bio),
          photo: pictures.repostPhoto ?? p.repost.author.photo,
        },
        time: or(read.repost.time, p.repost.time),
        text: or(read.repost.text, p.repost.text),
        picture: type === "repost" && media ? media : p.repost.picture,
      },
      event: {
        cover: type === "event" && media ? media : p.event.cover,
        title: or(read.event.title, p.event.title),
        date: or(read.event.date, p.event.date),
        when: or(read.event.when, p.event.when),
        place: or(read.event.place, p.event.place),
        attendees: or(read.event.attendees, p.event.attendees),
      },
      topComment: read.topComment
        ? { show: true, ...read.topComment, photo: pictures.commentPhoto ?? p.topComment.photo }
        : p.topComment,
    },
  }
}

/** What to tell the admin after filling in: what to check and what's still theirs to add. */
export function screenshotNotes(read: ScreenshotRead, pictures: ScreenshotPictures): string[] {
  const notes = ["Filled in from the screenshot. Check each field against the post: the AI copies, but can misread small print."]
  if (read.captionCut) notes.push("The screenshot cuts the post's text at “…more”. Open the post, click “more”, and paste the rest into the text box.")
  if (pictures.authorPhoto || pictures.media) notes.push("Pictures were cut out of the screenshot. If one is cropped badly, upload the original instead.")
  if (read.type === "slideshow") notes.push("Upload the slides themselves (images): a screenshot shows only the first.")
  if (read.type === "photos") notes.push("Upload the other photos: a screenshot shows them small.")
  if (read.type === "gif") notes.push("Upload the GIF itself: a screenshot can't move.")
  return notes
}
