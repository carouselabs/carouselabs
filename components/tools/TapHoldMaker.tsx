"use client"

import { ChangeEvent, DragEvent, PointerEvent, memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Brush, Check, Download, Eraser, ImageUp, LoaderCircle, Moon, Sun, Undo2 } from "lucide-react"
import { BrushEngine, type BrushPoint } from "./BrushEngine"
import { CanvasRenderer } from "./CanvasRenderer"
import { exportTapHoldImage, type ExportFormat } from "./ExportEngine"
import { loadImage, type LoadedImage } from "./ImageLoader"

const MAX_HISTORY = 10
type PointerSample = { clientX: number; clientY: number; pressure: number; pointerType: string }

export function TapHoldMaker() {
  const compositeRef = useRef<HTMLCanvasElement>(null)
  const timelineRef = useRef<HTMLCanvasElement>(null)
  const revealRef = useRef<HTMLCanvasElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cursorRef = useRef<HTMLSpanElement>(null)
  const cursorCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<CanvasRenderer | null>(null)
  const brushRef = useRef<BrushEngine | null>(null)
  const historyRef = useRef<HTMLCanvasElement[]>([])
  const brushSizeRef = useRef(48)
  const pointerIdRef = useRef<number | null>(null)
  const cursorFrameRef = useRef(0)
  const cursorPointRef = useRef<BrushPoint | null>(null)
  const previewFrameRef = useRef(0)
  const pendingImageRef = useRef<LoadedImage | null>(null)
  const loadRequestRef = useRef(0)
  const exportControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(false)
  const [imageVersion, setImageVersion] = useState(0)
  const [hasImage, setHasImage] = useState(false)
  const [brushSize, setBrushSize] = useState(48)
  const [historyCount, setHistoryCount] = useState(0)
  const [dark, setDark] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null)
  const [toast, setToast] = useState("")

  const renderPreviews = useCallback(() => {
    const renderer = rendererRef.current
    if (renderer && timelineRef.current && revealRef.current) renderer.renderPreviews(timelineRef.current, revealRef.current)
  }, [])

  const schedulePreviews = useCallback(() => {
    if (previewFrameRef.current) return
    previewFrameRef.current = requestAnimationFrame(() => {
      previewFrameRef.current = 0
      renderPreviews()
    })
  }, [renderPreviews])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(""), 3600)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      loadRequestRef.current += 1
      exportControllerRef.current?.abort()
      pendingImageRef.current?.dispose()
      pendingImageRef.current = null
      cancelAnimationFrame(cursorFrameRef.current)
      cancelAnimationFrame(previewFrameRef.current)
      cursorFrameRef.current = 0
      previewFrameRef.current = 0
      cursorCanvasRef.current?.remove()
      cursorCanvasRef.current = null
      brushRef.current?.destroy()
      brushRef.current = null
      rendererRef.current?.dispose()
      rendererRef.current = null
    }
  }, [])

  useEffect(() => {
    const composite = compositeRef.current
    if (!composite) return
    const hide = () => {
      const cursor = cursorCanvasRef.current
      cursor?.getContext("2d")?.clearRect(0, 0, cursor.width, cursor.height)
    }
    composite.addEventListener("pointerleave", hide)
    return () => composite.removeEventListener("pointerleave", hide)
  }, [hasImage])

  const ensureRenderer = useCallback(() => {
    if (!compositeRef.current) return null
    if (!rendererRef.current) {
      const renderer = new CanvasRenderer(compositeRef.current)
      rendererRef.current = renderer
      const cursorCanvas = document.createElement("canvas")
      cursorCanvas.dataset.brushCursor = "true"
      cursorCanvas.className = "pointer-events-none absolute inset-0 h-full w-full"
      compositeRef.current.parentElement?.appendChild(cursorCanvas)
      cursorCanvasRef.current = cursorCanvas
      const brush = new BrushEngine(renderer.mask)
      brush.setOnFlush((region) => {
        renderer.markDirty(region)
        schedulePreviews()
      })
      brushRef.current = brush
    }
    return rendererRef.current
  }, [schedulePreviews])

  // The first upload mounts the canvas. Consume decoded pixels only after
  // React has committed that canvas ref, including when rAF fires before commit.
  useLayoutEffect(() => {
    const image = pendingImageRef.current
    if (!image) return
    const renderer = ensureRenderer()
    if (!renderer) return
    pendingImageRef.current = null
    brushRef.current?.finish()
    pointerIdRef.current = null
    cursorPointRef.current = null
    renderer.load(image)
    if (cursorCanvasRef.current) {
      cursorCanvasRef.current.width = renderer.mask.width
      cursorCanvasRef.current.height = renderer.mask.height
    }
    historyRef.current = []
    schedulePreviews()
  }, [imageVersion, ensureRenderer, schedulePreviews])

  const loadFile = useCallback(async (file?: File) => {
    if (!file) return
    const request = ++loadRequestRef.current
    try {
      const image = await loadImage(file)
      if (!mountedRef.current || request !== loadRequestRef.current) {
        image.dispose()
        return
      }
      exportControllerRef.current?.abort()
      pendingImageRef.current?.dispose()
      pendingImageRef.current = image
      setHistoryCount(0)
      setHasImage(true)
      setImageVersion((version) => version + 1)
    } catch (err) {
      if (!mountedRef.current || request !== loadRequestRef.current) return
      setToast(err instanceof Error ? err.message : "Please choose a JPG, PNG, or WebP image.")
    }
  }, [])

  const pointerPositionRef = useRef<BrushPoint | null>(null)
  const getPoint = (event: PointerSample): BrushPoint => {
    const canvas = compositeRef.current!
    const bounds = canvas.getBoundingClientRect()
    return { x: ((event.clientX - bounds.left) / bounds.width) * canvas.width, y: ((event.clientY - bounds.top) / bounds.height) * canvas.height, pressure: event.pointerType === "pen" && event.pressure > 0 ? event.pressure : 1 }
  }

  const updateCursor = (event: PointerEvent<HTMLCanvasElement>) => {
    cursorPointRef.current = getPoint(event)
    if (cursorFrameRef.current) return
    cursorFrameRef.current = requestAnimationFrame(() => {
    cursorFrameRef.current = 0
    const point = cursorPointRef.current
    const cursor = cursorCanvasRef.current
    if (!cursor || !point) return
    const context = cursor.getContext("2d")!
    context.clearRect(0, 0, cursor.width, cursor.height)
    const radius = brushSizeRef.current * (point.pressure || 1) / 2
    context.strokeStyle = "rgba(124,58,237,0.95)"
    context.lineWidth = 1.5
    context.beginPath()
    context.arc(point.x, point.y, radius, 0, Math.PI * 2)
    context.stroke()
    context.fillStyle = "#7C3AED"
    context.beginPath()
    context.arc(point.x, point.y, 2, 0, Math.PI * 2)
    context.fill()
    })
  }

  const snapshotMask = () => {
    const mask = rendererRef.current?.mask
    if (!mask) return
    const snapshot = document.createElement("canvas")
    snapshot.width = mask.width
    snapshot.height = mask.height
    snapshot.getContext("2d")!.drawImage(mask, 0, 0)
    historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), snapshot]
    setHistoryCount(historyRef.current.length)
  }

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!brushRef.current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    updateCursor(event)
    pointerIdRef.current = event.pointerId
    snapshotMask()
    const point = getPoint(event)
    pointerPositionRef.current = point
    brushRef.current.start(point)
  }

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    updateCursor(event)
    if (pointerIdRef.current !== event.pointerId || !brushRef.current) return
    const nativeEvent = event.nativeEvent as unknown as { getCoalescedEvents?: () => PointerSample[] }
    const events: PointerSample[] = nativeEvent.getCoalescedEvents?.() ?? [event]
    const points = events.map((sample) => getPoint(sample))
    pointerPositionRef.current = points[points.length - 1] ?? null
    brushRef.current.enqueueMany(points)
  }

  const endStroke = () => {
    if (pointerIdRef.current === null) return
    brushRef.current?.finish()
    pointerIdRef.current = null
    schedulePreviews()
  }

  const undo = () => {
    const previous = historyRef.current.pop()
    const renderer = rendererRef.current
    if (!previous || !renderer) return
    const context = renderer.mask.getContext("2d")!
    context.clearRect(0, 0, renderer.mask.width, renderer.mask.height)
    context.drawImage(previous, 0, 0)
    renderer.markDirty({ x: 0, y: 0, width: renderer.mask.width, height: renderer.mask.height })
    setHistoryCount(historyRef.current.length)
    schedulePreviews()
  }

  const clear = () => {
    snapshotMask()
    rendererRef.current?.clearMask()
    schedulePreviews()
  }

  const exportImage = async (format: ExportFormat) => {
    const renderer = rendererRef.current
    if (!renderer || exportControllerRef.current) return
    const controller = new AbortController()
    exportControllerRef.current = controller
    brushRef.current?.finish()
    setExportingFormat(format)
    try {
      await new Promise((resolve) => requestAnimationFrame(resolve))
      controller.signal.throwIfAborted()
      await exportTapHoldImage(renderer.base, renderer.mask, renderer.mask.width, renderer.mask.height, format, controller.signal)
      if (!mountedRef.current || controller.signal.aborted) return
      setToast(format === "png" ? "Your PNG-8 is ready for X — download started." : "Your WebP download is ready.")
    } catch {
      if (mountedRef.current && !controller.signal.aborted) setToast("Export failed. Please try again with a smaller image.")
    } finally {
      if (exportControllerRef.current === controller) {
        exportControllerRef.current = null
        if (mountedRef.current) setExportingFormat(null)
      }
    }
  }

  // Theme comes from tokens: the toggle flips data-theme for this tool only.
  const secondaryButton =
    "inline-flex items-center justify-center gap-1.5 rounded-control-sm border border-control-border bg-surface px-3 py-2 text-label font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-40"

  return <section data-theme={dark ? "dark" : "light"} className="bg-background font-ui text-foreground">
    <div className="mx-auto max-w-showcase gutter-x py-12 sm:py-16">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-3">
          <span className="text-label font-medium text-brand">FREE · NO LOGIN REQUIRED</span>
          <h1 className="flex items-center gap-3 text-section font-semibold">
            {/* eslint-disable-next-line @next/next/no-img-element -- small fixed-size logo */}
            <img src="/images/tools/tap-hold-maker.svg" alt="" width={44} height={44} className="size-10 shrink-0 rounded-[10px] shadow-card sm:size-11" />
            Tap &amp; Hold Image Maker
          </h1>
          <p className="text-body-lg text-muted-foreground">Make a hidden-image surprise for X — entirely in your browser.</p>
        </div>
        <button onClick={() => setDark((value) => !value)} aria-label="Toggle light/dark mode" title="Toggle light/dark mode" className="inline-flex size-11 shrink-0 items-center justify-center self-start rounded-control border border-control-border bg-surface text-foreground transition-colors hover:bg-surface-muted sm:self-auto">{dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}</button>
      </div>

      {!hasImage ? <div role="button" tabIndex={0} aria-label="Choose an image" onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); inputRef.current?.click() } }} onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)} onDrop={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setIsDragging(false); void loadFile(event.dataTransfer.files[0]) }} onClick={() => inputRef.current?.click()} className={`mt-8 flex cursor-pointer flex-col items-center gap-3 rounded-showcase border-2 border-dashed px-6 py-20 text-center transition-colors duration-(--motion-fast) ${isDragging ? "border-brand bg-brand-soft" : "border-control-border/60 bg-surface hover:border-brand"}`}>
        <ImageUp className="text-brand" size={38} aria-hidden />
        <p className="text-body-lg font-semibold">Drop an image here, or click to browse</p>
        <p className="text-label text-muted-foreground">JPG, PNG, and WebP supported. Your file never leaves this device.</p>
      </div> : <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
        <div className="rounded-showcase border border-border bg-surface p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-body font-semibold">Paint the timeline teaser</p>
              <p className="text-caption text-muted-foreground">Purple marks stay fully visible on the timeline.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={undo} disabled={!historyCount} title="Undo your last brush action" className={secondaryButton}><Undo2 size={14} aria-hidden />Undo</button>
              <button onClick={clear} title="Clear all painted areas" className={secondaryButton}><Eraser size={14} aria-hidden />Clear</button>
            </div>
          </div>
          <label className="mb-4 flex items-center gap-3 text-label font-medium" title="Change the diameter of your paint brush"><Brush size={16} className="text-brand" aria-hidden /> Brush size <input type="range" min="10" max="100" value={brushSize} onChange={(event) => { const value = Number(event.target.value); brushSizeRef.current = value; brushRef.current?.setSize(value); setBrushSize(value) }} className="flex-1 accent-[var(--brand)] sm:flex-none" /> <span className="w-12 text-caption text-muted-foreground tabular-nums">{brushSize}px</span></label>
          <div className="relative overflow-hidden rounded-card bg-[linear-gradient(45deg,#e5e7eb_25%,transparent_25%,transparent_75%,#e5e7eb_75%),linear-gradient(45deg,#e5e7eb_25%,#fff_25%,#fff_75%,#e5e7eb_75%)] bg-[length:20px_20px] bg-[position:0_0,10px_10px]" style={{ touchAction: "none" }}>
            <canvas ref={compositeRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endStroke} onPointerCancel={endStroke} onPointerLeave={(event) => { if (cursorRef.current) cursorRef.current.style.opacity = "0"; if (pointerIdRef.current === event.pointerId) endStroke() }} className="block h-auto w-full cursor-none" />
            <span ref={cursorRef} aria-hidden className="pointer-events-none absolute left-0 top-0 rounded-full border-2 border-white bg-[#7C3AED]/20 shadow" style={{ opacity: 0 }} />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <p className="text-body font-semibold">Dual live preview</p>
          <Preview title="Timeline View" detail="Light timeline approximation" canvasRef={timelineRef} mode="timeline" />
          <Preview title="Tap & Hold View" detail="Full transparency mesh on black" canvasRef={revealRef} mode="reveal" />
          <div className="rounded-card bg-brand-soft p-4 text-caption text-brand">Preview is an approximation: X’s private compression can change, and hidden regions work best for viewers using a light timeline.</div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => void exportImage("png")} disabled={exportingFormat !== null} title="Download optimized indexed PNG-8 for X" className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-primary px-3 text-label font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60">{exportingFormat === "png" ? <LoaderCircle className="animate-spin motion-reduce:animate-none" size={16} aria-hidden /> : <Download size={16} aria-hidden />}Download for X</button>
            <button onClick={() => void exportImage("webp")} disabled={exportingFormat !== null} title="Download a WebP alternative" className="inline-flex h-12 items-center justify-center gap-2 rounded-control border border-control-border bg-surface px-3 text-label font-semibold text-foreground transition-colors hover:bg-surface-muted disabled:opacity-60">{exportingFormat === "webp" && <LoaderCircle className="animate-spin motion-reduce:animate-none" size={16} aria-hidden />}{exportingFormat === "webp" ? "Exporting…" : "WebP"}</button>
          </div>
          <button onClick={() => inputRef.current?.click()} className="min-h-11 w-full text-center text-label font-semibold text-brand underline-offset-4 hover:underline">Use a different image</button>
        </div>
      </div>}
      <input ref={inputRef} aria-label="Image file" className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event: ChangeEvent<HTMLInputElement>) => void loadFile(event.target.files?.[0])} />
      <div className="mt-12 grid gap-6 border-t border-border pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <h2 className="text-title-sm font-semibold">How to use it</h2>
        <ol className="flex flex-col gap-3 text-body text-muted-foreground [&_b]:font-semibold [&_b]:text-foreground"><li><b>1.</b> Upload your image.</li><li><b>2.</b> Paint over the parts you want visible in the timeline.</li><li><b>3.</b> Preview both views using the panels above.</li><li><b>4.</b> Download the image.</li><li><b>5.</b> Post it on X using a <b>desktop browser</b> (not the mobile app) for best results.</li><li><b>6.</b> Your followers can tap and hold on mobile to reveal the full image!</li></ol>
      </div>
    </div>{toast && <div role="status" className="fixed bottom-5 left-1/2 z-(--z-toast) flex -translate-x-1/2 items-center gap-2 rounded-control bg-primary px-4 py-3 text-label font-semibold text-primary-foreground shadow-dialog"><Check size={16} className="text-brand" aria-hidden />{toast}</div>}
  </section>
}

const Preview = memo(function Preview({ title, detail, canvasRef, mode }: { title: string; detail: string; canvasRef: React.RefObject<HTMLCanvasElement | null>; mode: "timeline" | "reveal" }) {
  return <div className="overflow-hidden rounded-card border border-border"><div className="flex items-center justify-between bg-surface-muted/60 px-3 py-2"><span className="text-caption font-semibold">{title}</span><span className="text-caption text-muted-foreground">{detail}</span></div><div className={mode === "reveal" ? "bg-black" : "bg-white"}><canvas ref={canvasRef} className="block h-auto w-full" /></div></div>
})
