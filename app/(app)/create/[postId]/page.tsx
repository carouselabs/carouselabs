export default function CreatePostPage({
  params,
}: {
  params: { postId: string }
}) {
  return (
    <main className="flex-1 p-8">
      <h1 className="text-3xl font-bold text-white">Create Post — {params.postId}</h1>
    </main>
  )
}
