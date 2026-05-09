'use client'

import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'

type WindMode = {
  body: string
  label: string
  metric: string
}

type WindFarmExperienceProps = {
  body: string
  eyebrow: string
  modes: WindMode[]
  title: string
}

type SequenceStyle = CSSProperties & {
  '--sequence-progress': string
  '--sequence-steps': string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getModeTone(index: number) {
  return index % 2 === 1 ? 'solution' : 'challenge'
}

export function WindFarmExperience({ body, eyebrow, modes, title }: WindFarmExperienceProps) {
  const [activeMode, setActiveMode] = useState(0)
  const [progress, setProgress] = useState(0)
  const activeModeRef = useRef(0)
  const animationFrameRef = useRef(0)
  const sectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    function update() {
      const section = sectionRef.current

      if (!section || modes.length <= 1) {
        return
      }

      const rect = section.getBoundingClientRect()
      const start = window.scrollY + rect.top
      const distance = Math.max(1, section.offsetHeight - window.innerHeight)
      const nextProgress = clamp((window.scrollY - start) / distance, 0, 1)
      const exactIndex = nextProgress * (modes.length - 1)
      const nextActiveMode = clamp(Math.round(exactIndex), 0, modes.length - 1)

      if (nextActiveMode !== activeModeRef.current) {
        activeModeRef.current = nextActiveMode
        setActiveMode(nextActiveMode)
      }

      setProgress(nextProgress)
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
  }, [modes.length])

  const active = modes[activeMode] ?? modes[0]
  const activeTone = getModeTone(activeMode)
  const sequenceStyle: SequenceStyle = {
    '--sequence-progress': progress.toFixed(4),
    '--sequence-steps': String(Math.max(modes.length, 1)),
  }

  function goToMode(index: number) {
    const section = sectionRef.current

    if (!section || modes.length <= 1) {
      return
    }

    const start = window.scrollY + section.getBoundingClientRect().top
    const distance = Math.max(1, section.offsetHeight - window.innerHeight)
    const nextProgress = clamp(index / (modes.length - 1), 0, 1)

    window.scrollTo({
      behavior: 'smooth',
      top: start + distance * nextProgress,
    })
  }

  return (
    <section
      className="wind-experience wind-sequence-experience"
      id="solutions"
      ref={sectionRef}
      style={sequenceStyle}
    >
      <div className="wind-sequence-sticky">
        <div className="wind-turbine-scene" aria-hidden="true">
          <div className="wind-field-grid" />
          <div className="wind-turbine wind-turbine-main">
            <span className="wind-tower" />
            <span className="wind-nacelle" />
            <span className="wind-rotor">
              <i />
              <i />
              <i />
            </span>
          </div>
          <div className="wind-turbine wind-turbine-secondary">
            <span className="wind-tower" />
            <span className="wind-nacelle" />
            <span className="wind-rotor">
              <i />
              <i />
              <i />
            </span>
          </div>
          <div className="wind-turbine wind-turbine-tertiary">
            <span className="wind-tower" />
            <span className="wind-nacelle" />
            <span className="wind-rotor">
              <i />
              <i />
              <i />
            </span>
          </div>
          <div className="wind-energy-line line-one" />
          <div className="wind-energy-line line-two" />
          <div className="wind-energy-line line-three" />
          <div className="wind-sequence-wash" />
        </div>

        <div className="wind-copy">
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{body}</p>
        </div>

        <div className={`wind-panel ${activeTone}`} aria-live="polite" data-ready="true">
          <small>{active.label}</small>
          <strong>{active.metric}</strong>
          <p>{active.body}</p>
          <div className="wind-actions" role="tablist" aria-label="Grid volatility sequence steps">
            {modes.map((mode, index) => (
              <button
                aria-label={mode.label}
                aria-selected={activeMode === index}
                key={`${mode.label}-${mode.metric}`}
                onClick={() => goToMode(index)}
                role="tab"
                type="button"
              >
                {String(index + 1).padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>

        <div className="wind-sequence-progress" aria-hidden="true">
          {modes.map((mode, index) => (
            <span className={index === activeMode ? 'is-active' : ''} key={mode.label} />
          ))}
        </div>
      </div>
    </section>
  )
}
