"use client"

import { ChangeEvent, DragEvent, PointerEvent, memo, useCallback, useEffect, useRef, useState } from "react"
import { Brush, Check, Download, Eraser, ImageUp, LoaderCircle, Moon, Sun, Undo2 } from "lucide-react"
import { BrushEngine, type BrushPoint } from "./BrushEngine"
import { CanvasRenderer } from "./CanvasRenderer"
import { exportTapHoldImage, type ExportFormat } from "./ExportEngine"
import { loadImage } from "./ImageLoader"

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
  const [hasImage, setHasImage] = useState(false)
  const [brushSize, setBrushSize] = useState(48)
  const [historyCount, setHistoryCount] = useState(0)
  const [dark, setDark] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
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

  useEffect(() => () => { brushRef.current?.destroy(); rendererRef.current?.dispose() }, [])

  useEffect(() => {
    const composite = compositeRef.current
    if (!composite) return
    const hide = () => hideCursor()
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

  const loadFile = useCallback(async (file?: File) => {
    if (!file) return
    try {
      const image = await loadImage(file)
      setHasImage(true)
      requestAnimationFrame(() => {
        const renderer = ensureRenderer()
        if (!renderer) { image.dispose(); return }
        renderer.load(image)
        if (cursorCanvasRef.current) {
          cursorCanvasRef.current.width = renderer.mask.width
          cursorCanvasRef.current.height = renderer.mask.height
        }
        historyRef.current = []
        setHistoryCount(0)
        requestAnimationFrame(renderPreviews)
      })
    } catch {
      setToast("Please choose a JPG, PNG, or WebP image.")
    }
  }, [ensureRenderer, renderPreviews])

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

  const hideCursor = () => {
    const cursor = cursorCanvasRef.current
    if (cursor) cursor.getContext("2d")!.clearRect(0, 0, cursor.width, cursor.height)
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
    if (!renderer) return
    setProcessing(true)
    try {
      await new Promise((resolve) => requestAnimationFrame(resolve))
      await exportTapHoldImage(renderer.base, renderer.mask, renderer.mask.width, renderer.mask.height, format)
      setToast(format === "png" ? "Your PNG-8 is ready for X — download started." : "Your WebP download is ready.")
    } catch {
      setToast("Export failed. Please try again with a smaller image.")
    } finally { setProcessing(false) }
  }

  return <section className={dark ? "bg-[#14111d] text-white" : "bg-[#F9F7F2] text-[#17121f]"}>
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-3xl text-center"><span className="inline-flex rounded-full bg-[#EDE9FE] px-3 py-1 text-xs font-bold text-[#6D28D9]">FREE · NO LOGIN REQUIRED</span><h1 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">Tap &amp; Hold Image Maker</h1><p className={dark ? "mt-4 text-[#c7c0d0]" : "mt-4 text-[#675f70]"}>Make a hidden-image surprise for X — entirely in your browser.</p></div>
      <div className="mt-8 flex justify-end"><button onClick={() => setDark((value) => !value)} className={dark ? "rounded-lg border border-white/15 p-2" : "rounded-lg border border-[#ded8e4] bg-white p-2"} title="Toggle light/dark mode">{dark ? <Sun size={18} /> : <Moon size={18} />}</button></div>
      {!hasImage ? <div onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)} onDrop={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setIsDragging(false); void loadFile(event.dataTransfer.files[0]) }} onClick={() => inputRef.current?.click()} className={`mt-2 cursor-pointer rounded-3xl border-2 border-dashed px-6 py-20 text-center transition ${isDragging ? "border-[#7C3AED] bg-[#EDE9FE]" : dark ? "border-white/20 bg-white/5 hover:border-[#a78bfa]" : "border-[#d8d0e0] bg-white hover:border-[#7C3AED]"}`}><ImageUp className="mx-auto text-[#7C3AED]" size={38} /><p className="mt-4 text-lg font-bold">Drop an image here, or click to browse</p><p className={dark ? "mt-2 text-sm text-[#c7c0d0]" : "mt-2 text-sm text-[#756d7b]"}>JPG, PNG, and WebP supported. Your file never leaves this device.</p></div> : <div className="mt-2 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]"><div className={dark ? "rounded-3xl border border-white/10 bg-white/5 p-4" : "rounded-3xl border border-[#e6e0e9] bg-white p-4 shadow-sm"}><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold">Paint the timeline teaser</p><p className={dark ? "text-xs text-[#c7c0d0]" : "text-xs text-[#756d7b]"}>Purple marks stay fully visible on the timeline.</p></div><div className="flex gap-2"><button onClick={undo} disabled={!historyCount} title="Undo your last brush action" className="inline-flex items-center gap-1.5 rounded-lg border border-[#d8d0e0] px-3 py-2 text-xs font-bold disabled:opacity-40"><Undo2 size={14} />Undo</button><button onClick={clear} title="Clear all painted areas" className="inline-flex items-center gap-1.5 rounded-lg border border-[#d8d0e0] px-3 py-2 text-xs font-bold"><Eraser size={14} />Clear</button></div></div><label className="mb-4 flex items-center gap-3 text-sm font-semibold" title="Change the diameter of your paint brush"><Brush size={16} className="text-[#7C3AED]" /> Brush size <input type="range" min="10" max="100" value={brushSize} onChange={(event) => { const value = Number(event.target.value); brushSizeRef.current = value; brushRef.current?.setSize(value); setBrushSize(value) }} className="accent-[#7C3AED]" /> <span className="w-10 text-xs">{brushSize}px</span></label><div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(45deg,#e5e7eb_25%,transparent_25%,transparent_75%,#e5e7eb_75%),linear-gradient(45deg,#e5e7eb_25%,#fff_25%,#fff_75%,#e5e7eb_75%)] bg-[length:20px_20px] bg-[position:0_0,10px_10px]" style={{ touchAction: "none" }}><canvas ref={compositeRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endStroke} onPointerCancel={endStroke} onPointerLeave={(event) => { cursorRef.current && (cursorRef.current.style.opacity = "0"); if (pointerIdRef.current === event.pointerId) endStroke() }} className="block h-auto w-full cursor-none" /><span ref={cursorRef} aria-hidden className="pointer-events-none absolute left-0 top-0 rounded-full border-2 border-white bg-[#7C3AED]/20 shadow" style={{ opacity: 0 }} /></div></div><div className="space-y-4"><p className="text-sm font-bold">Dual live preview</p><Preview title="Timeline View" detail="Light timeline approximation" canvasRef={timelineRef} mode="timeline" dark={dark} /><Preview title="Tap & Hold View" detail="Full transparency mesh on black" canvasRef={revealRef} mode="reveal" dark={dark} /><div className={dark ? "rounded-2xl bg-[#7C3AED]/20 p-4 text-xs leading-5 text-[#ddd6fe]" : "rounded-2xl bg-[#F3F0FF] p-4 text-xs leading-5 text-[#5B21B6]"}>Preview is an approximation: X’s private compression can change, and hidden regions work best for viewers using a light timeline.</div><div className="grid grid-cols-2 gap-2"><button onClick={() => void exportImage("png")} disabled={processing} title="Download optimized indexed PNG-8 for X" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-3 py-3 text-sm font-bold text-white hover:bg-[#6D28D9] disabled:opacity-60">{processing ? <LoaderCircle className="animate-spin" size={16} /> : <Download size={16} />}Download for X</button><button onClick={() => void exportImage("webp")} disabled={processing} title="Download a WebP alternative" className={dark ? "rounded-xl border border-white/20 px-3 py-3 text-sm font-bold" : "rounded-xl border border-[#d8d0e0] bg-white px-3 py-3 text-sm font-bold"}>WebP</button></div><button onClick={() => inputRef.current?.click()} className="w-full text-center text-xs font-bold text-[#7C3AED]">Use a different image</button></div></div>}
      <input ref={inputRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event: ChangeEvent<HTMLInputElement>) => void loadFile(event.target.files?.[0])} />
      <div className={dark ? "mt-10 rounded-3xl border border-white/10 bg-white/5 p-6" : "mt-10 rounded-3xl border border-[#e6e0e9] bg-white p-6"}><h2 className="text-xl font-extrabold">How to use it</h2><ol className={dark ? "mt-4 space-y-3 text-sm text-[#d6cfdd]" : "mt-4 space-y-3 text-sm text-[#625a68]"}><li><b>1.</b> Upload your image.</li><li><b>2.</b> Paint over the parts you want visible in the timeline.</li><li><b>3.</b> Preview both views using the panels above.</li><li><b>4.</b> Download the image.</li><li><b>5.</b> Post it on X using a <b>desktop browser</b> (not the mobile app) for best results.</li><li><b>6.</b> Your followers can tap and hold on mobile to reveal the full image!</li></ol></div>
    </div>{toast && <div role="status" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-[#17121f] px-4 py-3 text-sm font-semibold text-white shadow-xl"><Check size={16} className="text-[#a78bfa]" />{toast}</div>}
  </section>
}

const Preview = memo(function Preview({ title, detail, canvasRef, mode, dark }: { title: string; detail: string; canvasRef: React.RefObject<HTMLCanvasElement | null>; mode: "timeline" | "reveal"; dark: boolean }) {
  return <div className={dark ? "overflow-hidden rounded-2xl border border-white/10" : "overflow-hidden rounded-2xl border border-[#e6e0e9]"}><div className={dark ? "flex items-center justify-between bg-white/5 px-3 py-2" : "flex items-center justify-between bg-[#faf9fb] px-3 py-2"}><span className="text-xs font-bold">{title}</span><span className={dark ? "text-[10px] text-[#bdb4c6]" : "text-[10px] text-[#817889]"}>{detail}</span></div><div className={mode === "reveal" ? "bg-black" : "bg-white"}><canvas ref={canvasRef} className="block h-auto w-full" /></div></div>
})
