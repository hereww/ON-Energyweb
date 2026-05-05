'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { StoryItem } from '@/content/types'

type ScrollStoryProps = {
  items: StoryItem[]
}

type SequenceDevice = 'desktop' | 'mobile'

type MotionState = {
  frameIndex: number
  pinX: number
  pinY: number
  progress: number
  sequenceDevice: SequenceDevice
}

type StoryStyle = CSSProperties & {
  '--pin-x': string
  '--pin-y': string
  '--story-progress': string
  '--story-steps': string
}

const TOTAL_FRAMES = 200
const MOBILE_BREAKPOINT = 834
const PRELOAD_RADIUS = 10
const PRELOAD_STRIDE = 8

const storyKeyframes = [
  { pinX: 54, pinY: 46 },
  { pinX: 30, pinY: 42 },
  { pinX: 68, pinY: 36 },
  { pinX: 24, pinY: 62 },
  { pinX: 72, pinY: 30 },
  { pinX: 35, pinY: 70 },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}

function getKeyframe(index: number) {
  return storyKeyframes[index % storyKeyframes.length]
}

function getSequenceDevice() {
  return window.innerWidth < MOBILE_BREAKPOINT ? 'mobile' : 'desktop'
}

function getFrameSrc(device: SequenceDevice, frameIndex: number) {
  return `/assets/grid-volatility/${device}/grid-volatility_${String(frameIndex).padStart(3, '0')}.webp`
}

function getMetricProgress(value: string) {
  const ratio = value.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/)

  if (ratio) {
    return clamp((Number(ratio[1]) / Number(ratio[2])) * 100, 8, 94)
  }

  const number = Number(value.replace(/[^\d.]/g, ''))

  if (Number.isFinite(number) && number > 0) {
    return clamp(number > 100 ? 78 : number, 12, 94)
  }

  return 72
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
  const drawWidth = image.naturalWidth * scale
  const drawHeight = image.naturalHeight * scale
  const x = (width - drawWidth) / 2
  const y = (height - drawHeight) / 2

  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(image, x, y, drawWidth, drawHeight)
}

export function ScrollStory({ items }: ScrollStoryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [motion, setMotion] = useState<MotionState>({
    frameIndex: 0,
    pinX: 58,
    pinY: 46,
    progress: 0,
    sequenceDevice: 'desktop',
  })
  const activeIndexRef = useRef(0)
  const animationFrameRef = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const currentFrameRef = useRef(0)
  const currentImageRef = useRef<HTMLImageElement | null>(null)
  const deviceRef = useRef<SequenceDevice>('desktop')
  const imageCacheRef = useRef(new Map<string, HTMLImageElement>())
  const pendingLoadsRef = useRef(new Map<string, Promise<HTMLImageElement | null>>())
  const progressRef = useRef(0)
  const renderRef = useRef<(() => void) | null>(null)
  const sectionRef = useRef<HTMLElement | null>(null)
  const setCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node
  }, [])

  useEffect(() => {
    const canvasElement = canvasRef.current

    if (!canvasElement) {
      return
    }

    const activeCanvas = canvasElement
    const ctx = activeCanvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
    })

    if (!ctx) {
      return
    }

    const context = ctx
    let cancelled = false
    let lastHeight = 0
    let lastWidth = 0

    function drawFallback(width: number, height: number) {
      const gradient = context.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, '#f4f4ef')
      gradient.addColorStop(0.52, '#ddded8')
      gradient.addColorStop(1, '#111111')
      context.fillStyle = gradient
      context.fillRect(0, 0, width, height)
    }

    function resize() {
      const parent = activeCanvas.parentElement
      const cssWidth = Math.max(1, parent?.clientWidth ?? activeCanvas.clientWidth)
      const cssHeight = Math.max(1, parent?.clientHeight ?? activeCanvas.clientHeight)
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.round(cssWidth * pixelRatio)
      const height = Math.round(cssHeight * pixelRatio)

      if (width === lastWidth && height === lastHeight) {
        return
      }

      lastWidth = width
      lastHeight = height
      activeCanvas.width = width
      activeCanvas.height = height
      activeCanvas.style.width = `${cssWidth}px`
      activeCanvas.style.height = `${cssHeight}px`

      const image = currentImageRef.current
      if (image) {
        drawCover(context, image, width, height)
      } else {
        drawFallback(width, height)
      }
    }

    function cacheKey(device: SequenceDevice, frameIndex: number) {
      return `${device}:${frameIndex}`
    }

    function loadFrame(device: SequenceDevice, frameIndex: number) {
      const key = cacheKey(device, frameIndex)
      const cached = imageCacheRef.current.get(key)

      if (cached) {
        return Promise.resolve(cached)
      }

      const pending = pendingLoadsRef.current.get(key)

      if (pending) {
        return pending
      }

      const promise = new Promise<HTMLImageElement | null>((resolve) => {
        const image = new Image()
        image.decoding = 'async'
        image.onload = () => {
          imageCacheRef.current.set(key, image)
          pendingLoadsRef.current.delete(key)
          resolve(image)
        }
        image.onerror = () => {
          pendingLoadsRef.current.delete(key)
          resolve(null)
        }
        image.src = getFrameSrc(device, frameIndex)
      })

      pendingLoadsRef.current.set(key, promise)

      return promise
    }

    function drawFrame(device: SequenceDevice, frameIndex: number) {
      const clampedFrame = clamp(frameIndex, 0, TOTAL_FRAMES - 1)
      const key = cacheKey(device, clampedFrame)
      const cached = imageCacheRef.current.get(key)

      if (cached) {
        currentImageRef.current = cached
        drawCover(context, cached, activeCanvas.width, activeCanvas.height)
        return
      }

      loadFrame(device, clampedFrame).then((image) => {
        if (cancelled || !image) {
          return
        }

        if (deviceRef.current !== device || currentFrameRef.current !== clampedFrame) {
          return
        }

        currentImageRef.current = image
        drawCover(context, image, activeCanvas.width, activeCanvas.height)
      })
    }

    function preloadAround(device: SequenceDevice, frameIndex: number) {
      const frames = new Set<number>()

      for (let offset = 1; offset <= PRELOAD_RADIUS; offset += 1) {
        frames.add(clamp(frameIndex - offset, 0, TOTAL_FRAMES - 1))
        frames.add(clamp(frameIndex + offset, 0, TOTAL_FRAMES - 1))
      }

      for (let frame = 0; frame < TOTAL_FRAMES; frame += PRELOAD_STRIDE) {
        frames.add(frame)
      }

      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          frames.forEach((frame) => {
            void loadFrame(device, frame)
          })
        })

        return
      }

      window.setTimeout(() => {
        frames.forEach((frame) => {
          void loadFrame(device, frame)
        })
      }, 80)
    }

    function render() {
      resize()
      const device = getSequenceDevice()
      const frameIndex = clamp(Math.round(progressRef.current * (TOTAL_FRAMES - 1)), 0, TOTAL_FRAMES - 1)

      if (device !== deviceRef.current) {
        deviceRef.current = device
        currentImageRef.current = null
      }

      currentFrameRef.current = frameIndex
      activeCanvas.dataset.frameIndex = String(frameIndex)
      activeCanvas.dataset.sequenceDevice = device
      drawFrame(device, frameIndex)
      preloadAround(device, frameIndex)
    }

    renderRef.current = render
    resize()
    deviceRef.current = getSequenceDevice()
    drawFallback(activeCanvas.width, activeCanvas.height)
    drawFrame(deviceRef.current, 0)
    preloadAround(deviceRef.current, 0)

    const resizeObserver = new ResizeObserver(render)
    resizeObserver.observe(activeCanvas.parentElement ?? activeCanvas)
    window.addEventListener('resize', render)

    return () => {
      cancelled = true
      resizeObserver.disconnect()
      window.removeEventListener('resize', render)
      renderRef.current = null
    }
  }, [])

  useEffect(() => {
    function update() {
      const section = sectionRef.current

      if (!section || items.length <= 1) {
        return
      }

      const rect = section.getBoundingClientRect()
      const start = window.scrollY + rect.top
      const distance = Math.max(1, section.offsetHeight - window.innerHeight)
      const progress = clamp((window.scrollY - start) / distance, 0, 1)
      const exactIndex = progress * (items.length - 1)
      const fromIndex = Math.floor(exactIndex)
      const toIndex = Math.min(items.length - 1, fromIndex + 1)
      const localProgress = exactIndex - fromIndex
      const from = getKeyframe(fromIndex)
      const to = getKeyframe(toIndex)
      const nextActiveIndex = clamp(Math.round(exactIndex), 0, items.length - 1)
      const frameIndex = clamp(Math.round(progress * (TOTAL_FRAMES - 1)), 0, TOTAL_FRAMES - 1)
      const sequenceDevice = getSequenceDevice()

      progressRef.current = progress

      if (nextActiveIndex !== activeIndexRef.current) {
        activeIndexRef.current = nextActiveIndex
        setActiveIndex(nextActiveIndex)
      }

      setMotion({
        frameIndex,
        pinX: lerp(from.pinX, to.pinX, localProgress),
        pinY: lerp(from.pinY, to.pinY, localProgress),
        progress,
        sequenceDevice,
      })

      renderRef.current?.()
    }

    function requestUpdate() {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)

    return () => {
      window.cancelAnimationFrame(animationFrameRef.current)
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
    }
  }, [items.length])

  const activeItem = items[activeIndex] ?? items[0]
  const metricProgress = getMetricProgress(activeItem?.metricValue ?? '')
  const storyStyle: StoryStyle = {
    '--pin-x': `${motion.pinX.toFixed(2)}%`,
    '--pin-y': `${motion.pinY.toFixed(2)}%`,
    '--story-progress': motion.progress.toFixed(4),
    '--story-steps': String(Math.max(items.length, 1)),
  }

  if (!activeItem) {
    return null
  }

  function goToStep(index: number) {
    const section = sectionRef.current

    if (!section || items.length <= 1) {
      return
    }

    const start = window.scrollY + section.getBoundingClientRect().top
    const distance = Math.max(1, section.offsetHeight - window.innerHeight)
    const progress = clamp(index / (items.length - 1), 0, 1)

    window.scrollTo({
      behavior: 'smooth',
      top: start + distance * progress,
    })
  }

  return (
    <section className="story-shell" id="solutions" ref={sectionRef} style={storyStyle}>
      <div className="story-sticky">
        <div className="map-canvas" aria-hidden="true">
          <canvas
            className="image-sequence-canvas"
            data-frame-index={motion.frameIndex}
            data-sequence-device={motion.sequenceDevice}
            ref={setCanvasRef}
          />
          <div className="map-overlay" />
        </div>

        <div className={`map-pin pin-${activeItem.kind}`} aria-hidden="true">
          <span>{activeItem.kind === 'solution' ? 'BESS' : 'RISK'}</span>
        </div>

        <div className="story-progress-dots" aria-hidden="true">
          {items.map((item, index) => (
            <span
              className={index === activeIndex ? 'is-active' : ''}
              key={`${item.kind}-${item.number}-dot`}
            />
          ))}
        </div>

        <div className="story-card-stack" aria-live="polite">
          {items.map((item, index) => (
            <article
              aria-hidden={index !== activeIndex}
              className={`story-card ${item.kind} ${index === activeIndex ? 'is-active' : ''}`}
              key={`${item.kind}-${item.number}-${item.title}`}
            >
              <div className="story-kicker">
                <i aria-hidden="true" />
                {item.kind === 'solution' ? 'Solution' : 'Challenge'} {item.number}
              </div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <button
                aria-label={`${item.title}: ${item.metricLabel}`}
                className="story-card-button"
                onClick={() => goToStep(index)}
                type="button"
              >
                <span />
                <span />
                <span />
                <span />
                <span />
              </button>
            </article>
          ))}
        </div>

        <div className={`story-meter ${activeItem.kind}`}>
          <div>
            <small>{activeItem.metricLabel}</small>
            <strong>
              {activeItem.metricValue}
              {activeItem.metricUnit && <span>{activeItem.metricUnit}</span>}
            </strong>
          </div>
          <div className="story-meter-track" aria-hidden="true">
            <span style={{ width: `${metricProgress}%` }} />
          </div>
        </div>
      </div>
    </section>
  )
}
