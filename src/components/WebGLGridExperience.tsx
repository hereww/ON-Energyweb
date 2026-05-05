'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'

import type { GridSceneStep } from '@/content/types'

type WebGLGridExperienceProps = {
  eyebrow: string
  title: string
  body: string
  labels: {
    capacity: string
    drag: string
    fallback: string
    loading: string
    steps: string
  }
  steps: GridSceneStep[]
}

const CITY_GLB_PATH = '/assets/webgl/gltf/city.glb'
const DRACO_PATH = '/assets/webgl/libs/draco/gltf/'
const BASIS_PATH = '/assets/webgl/libs/basis/'

const cameraViews = [
  {
    lookAt: new THREE.Vector3(22.08, 0, 8.66),
    position: new THREE.Vector3(88.97, 66.24, 75.55),
    zoom: 2.75,
  },
  {
    lookAt: new THREE.Vector3(22.08, 0, 8.66),
    position: new THREE.Vector3(68, 44, 54),
    zoom: 3,
  },
  {
    lookAt: new THREE.Vector3(20.66, 0, 8.49),
    position: new THREE.Vector3(42, 18, 24),
    zoom: 2.85,
  },
  {
    lookAt: new THREE.Vector3(23.4, 0, 8.5),
    position: new THREE.Vector3(31, 10, 14),
    zoom: 3.2,
  },
  {
    lookAt: new THREE.Vector3(25.42, 0, 9.45),
    position: new THREE.Vector3(44, 26, -14),
    zoom: 2.45,
  },
  {
    lookAt: new THREE.Vector3(25.42, 0, 9.45),
    position: new THREE.Vector3(56, 40, -16),
    zoom: 2.2,
  },
]

const pinPositions = [
  { x: 58, y: 45 },
  { x: 61, y: 47 },
  { x: 48, y: 42 },
  { x: 65, y: 52 },
  { x: 72, y: 56 },
  { x: 74, y: 58 },
]

function webglSupported() {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function lerpVector(from: THREE.Vector3, to: THREE.Vector3, amount: number) {
  return from.clone().lerp(to, amount)
}

function normalizeName(name: string) {
  return name.replace(/[._:]/g, '').toUpperCase()
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return
    }

    child.geometry?.dispose()
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) {
          value.dispose()
        }
      })
      material.dispose()
    })
  })
}

export function WebGLGridExperience({
  body,
  eyebrow,
  labels,
  steps: sceneSteps,
  title,
}: WebGLGridExperienceProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const activeStepRef = useRef(0)
  const mountRef = useRef<HTMLDivElement | null>(null)
  const progressRef = useRef(0)
  const sectionRef = useRef<HTMLElement | null>(null)
  const dragRef = useRef({ isDragging: false, lastX: 0, lastY: 0, rotateX: 0, rotateY: 0 })
  const setMountRef = useCallback((node: HTMLDivElement | null) => {
    mountRef.current = node
  }, [])

  useEffect(() => {
    const mount = mountRef.current

    if (!mount) {
      return
    }

    const hostElement = mount

    if (!webglSupported()) {
      hostElement.dataset.webgl = 'unavailable'
      return
    }

    hostElement.dataset.webgl = 'available'

    let destroyed = false
    let frameId = 0
    let cityRoot: THREE.Group | null = null
    let carObjects: THREE.Object3D[] = []
    let windObjects: THREE.Object3D[] = []
    let batteryGroups: THREE.Object3D[] = []
    const lineObjects: THREE.Mesh[] = []
    let sceneKtx2Loader: KTX2Loader | null = null
    let sceneDracoLoader: DRACOLoader | null = null
    let sceneGltfLoader: GLTFLoader | null = null

    let renderer: THREE.WebGLRenderer

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      })
    } catch (error) {
      console.error('Grid volatility WebGL scene could not start.', error)
      hostElement.dataset.webgl = 'unavailable'
      return
    }
    renderer.setClearColor(0x050505, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    hostElement.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = null
    scene.fog = new THREE.Fog(0x050505, 58, 170)

    const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 240)
    const ambient = new THREE.HemisphereLight(0xffffff, 0x111111, 1.35)
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2)
    const fillLight = new THREE.DirectionalLight(0xfff313, 1.1)
    keyLight.position.set(18, 44, 28)
    fillLight.position.set(-28, 16, -18)
    scene.add(ambient, keyLight, fillLight)

    const routeMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4e13,
      transparent: true,
      opacity: 0.92,
    })

    const fallbackTarget = new THREE.Vector3()
    const resizeObserver = new ResizeObserver(resize)

    function resize() {
      if (destroyed) {
        return
      }

      const width = Math.max(1, hostElement.clientWidth)
      const height = Math.max(1, hostElement.clientHeight)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    function setStepFromProgress(progress: number) {
      const index = clamp(Math.round(progress * (sceneSteps.length - 1)), 0, sceneSteps.length - 1)

      if (index !== activeStepRef.current) {
        activeStepRef.current = index
        setActiveStep(index)
      }
    }

    function updateScrollProgress() {
      const section = sectionRef.current

      if (!section) {
        return
      }

      const rect = section.getBoundingClientRect()
      const start = window.scrollY + rect.top
      const distance = Math.max(1, section.offsetHeight - window.innerHeight)
      const progress = clamp((window.scrollY - start) / distance, 0, 1)
      progressRef.current = progress
      setStepFromProgress(progress)
    }

    function scheduleScrollUpdate() {
      window.requestAnimationFrame(updateScrollProgress)
    }

    function onPointerDown(event: PointerEvent) {
      dragRef.current.isDragging = true
      dragRef.current.lastX = event.clientX
      dragRef.current.lastY = event.clientY
      setIsDragging(true)
      renderer.domElement.setPointerCapture(event.pointerId)
    }

    function onPointerMove(event: PointerEvent) {
      if (!dragRef.current.isDragging) {
        return
      }

      const deltaX = event.clientX - dragRef.current.lastX
      const deltaY = event.clientY - dragRef.current.lastY
      dragRef.current.lastX = event.clientX
      dragRef.current.lastY = event.clientY
      dragRef.current.rotateY += deltaX * 0.003
      dragRef.current.rotateX = clamp(dragRef.current.rotateX + deltaY * 0.002, -0.32, 0.34)
    }

    function onPointerUp(event: PointerEvent) {
      dragRef.current.isDragging = false
      setIsDragging(false)
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId)
      }
    }

    function updateSceneMaterial(root: THREE.Object3D) {
      root.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) {
          return
        }

        const name = normalizeName(child.name)
        child.frustumCulled = false

        if (name.includes('LINE') && !name.includes('OUTLINE')) {
          child.material = routeMaterial.clone()
          lineObjects.push(child)
          return
        }

        if (name === 'FLOOR' || name.includes('00FLOOR')) {
          child.visible = false
          return
        }

        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach((material) => {
          if ('color' in material && material.color instanceof THREE.Color) {
            if (name.includes('OUTLINE') || name.includes('BLACK')) {
              material.color.set('#141414')
            } else if (name.includes('ROAD')) {
              material.color.set('#3e3e3e')
            } else if (name.includes('FLOORLINE')) {
              material.color.set('#5a5a5a')
            } else if (name.includes('WIND') || name.includes('BESS') || name.includes('BATTER')) {
              material.color.set('#e8e8e8')
            } else {
              material.color.set('#9d9d9d')
            }
          }

          if ('metalness' in material) {
            material.metalness = 0.04
          }

          if ('roughness' in material) {
            material.roughness = 0.72
          }

          if ('transparent' in material) {
            material.transparent = true
          }

          if ('opacity' in material) {
            material.opacity = name.includes('OUTLINE') ? 0.74 : 0.92
          }
        })
      })
    }

    function collectObjects(root: THREE.Object3D) {
      const cars: THREE.Object3D[] = []
      const winds: THREE.Object3D[] = []
      const batteries: THREE.Object3D[] = []

      root.traverse((child) => {
        const name = normalizeName(child.name)

        if (name.startsWith('CAR') && child.children.length > 0) {
          cars.push(child)
        }

        if (name.startsWith('WIND') && child.children.length > 0) {
          winds.push(child)
        }

        if (
          (name.startsWith('CITYBATTIES') || name.startsWith('CITYBATTERIESWINDSOLAR')) &&
          child.children.length > 0
        ) {
          batteries.push(child)
        }
      })

      carObjects = cars
      windObjects = winds
      batteryGroups = batteries
      batteryGroups.forEach((group) => {
        group.userData.originalY = group.position.y
      })
    }

    function positionCamera(progress: number) {
      const scaled = progress * (cameraViews.length - 1)
      const fromIndex = clamp(Math.floor(scaled), 0, cameraViews.length - 1)
      const toIndex = clamp(fromIndex + 1, 0, cameraViews.length - 1)
      const localProgress = scaled - fromIndex
      const from = cameraViews[fromIndex]
      const to = cameraViews[toIndex]

      if (!from || !to) {
        return
      }

      const pos = lerpVector(from.position, to.position, localProgress)
      const target = lerpVector(from.lookAt, to.lookAt, localProgress)
      const dragScale = clamp(1 - progress * 0.35, 0.7, 1)

      fallbackTarget.copy(target)
      camera.position.copy(pos)
      camera.position.x += Math.sin(dragRef.current.rotateY) * 5.5 * dragScale
      camera.position.y += dragRef.current.rotateX * 8 * dragScale
      camera.lookAt(fallbackTarget)
      camera.zoom = from.zoom + (to.zoom - from.zoom) * localProgress
      camera.updateProjectionMatrix()
    }

    function animate() {
      if (destroyed) {
        return
      }

      const elapsed = performance.now() / 1000
      const progress = progressRef.current
      positionCamera(progress)

      carObjects.forEach((car, index) => {
        car.position.x += Math.sin(elapsed * 0.65 + index) * 0.0025
        car.position.z += Math.cos(elapsed * 0.52 + index) * 0.0025
      })

      windObjects.forEach((wind, index) => {
        wind.rotation.y += 0.018 + index * 0.001
      })

      batteryGroups.forEach((battery, index) => {
        const reveal = clamp((progress - 0.12 - index * 0.005) * 5, 0, 1)
        const originalY = Number(battery.userData.originalY ?? battery.position.y)
        battery.position.y = originalY - (1 - reveal) * 0.42
      })

      lineObjects.forEach((line, index) => {
        const material = line.material as THREE.MeshBasicMaterial
        material.opacity = 0.4 + Math.sin(elapsed * 2.4 + index) * 0.28
      })

      renderer.render(scene, camera)
      frameId = window.requestAnimationFrame(animate)
    }

    async function loadCity() {
      try {
        sceneKtx2Loader = new KTX2Loader()
        sceneKtx2Loader.setTranscoderPath(BASIS_PATH).detectSupport(renderer)
        sceneDracoLoader = new DRACOLoader()
        sceneDracoLoader.setDecoderPath(DRACO_PATH)
        sceneGltfLoader = new GLTFLoader()
        sceneGltfLoader.setKTX2Loader(sceneKtx2Loader)
        sceneGltfLoader.setDRACOLoader(sceneDracoLoader)

        const gltf = await sceneGltfLoader.loadAsync(
          CITY_GLB_PATH,
          (event: ProgressEvent<EventTarget>) => {
            const target = event.target

            if (
              target &&
              'addEventListener' in target &&
              typeof target.addEventListener === 'function'
            ) {
              target.addEventListener(
                'error',
                () => {
                  if (!destroyed) {
                    setLoadError(true)
                    setIsReady(false)
                  }
                },
                { once: true },
              )
            }
          },
        )

        if (destroyed) {
          disposeObject(gltf.scene)
          return
        }

        const nextCityRoot = gltf.scene
        cityRoot = nextCityRoot
        nextCityRoot.scale.setScalar(1)
        nextCityRoot.position.set(0, 0, 0)
        updateSceneMaterial(nextCityRoot)
        collectObjects(nextCityRoot)
        scene.add(nextCityRoot)
        setLoadError(false)
        setIsReady(true)
      } catch (error) {
        console.error('Grid volatility city GLB could not load.', error)
        setLoadError(true)
        setIsReady(false)
      }
    }

    resizeObserver.observe(hostElement)
    resize()
    updateScrollProgress()
    void loadCity()
    animate()

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('scroll', scheduleScrollUpdate, { passive: true })
    window.addEventListener('resize', scheduleScrollUpdate)

    return () => {
      destroyed = true
      window.cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('scroll', scheduleScrollUpdate)
      window.removeEventListener('resize', scheduleScrollUpdate)

      if (cityRoot) {
        disposeObject(cityRoot)
        scene.remove(cityRoot)
      }

      routeMaterial.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [sceneSteps.length])

  const active = sceneSteps[activeStep]
  const pin = pinPositions[activeStep] ?? pinPositions[0]

  function goToStep(index: number) {
    const section = sectionRef.current

    if (!section) {
      return
    }

    const start = window.scrollY + section.getBoundingClientRect().top
    const distance = Math.max(1, section.offsetHeight - window.innerHeight)
    const progress = clamp(index / (sceneSteps.length - 1), 0, 1)
    window.scrollTo({
      behavior: 'smooth',
      top: start + distance * progress,
    })
  }

  return (
    <section className="webgl-experience grid-volatility-scene" id="solutions" ref={sectionRef}>
      <div className="webgl-sticky">
        <div
          className="webgl-stage"
          data-dragging={isDragging ? 'true' : 'false'}
          data-ready={isReady ? 'true' : 'false'}
          ref={setMountRef}
        />
        <div className="grid-scene-wash" aria-hidden="true" />

        <div
          className={`webgl-map-pin ${active.kind}`}
          style={{ '--pin-x': `${pin?.x ?? 58}%`, '--pin-y': `${pin?.y ?? 45}%` } as CSSProperties}
        >
          {active.number}
        </div>

        <div className={`grid-info-card ${active.kind}`} aria-live="polite">
          <div className="grid-info-kicker">
            <span aria-hidden="true" />
            {active.label} {active.number}
          </div>
          <h2>{active.title}</h2>
          <p>{active.body}</p>
          {!isReady && !loadError && <small>{labels.loading}</small>}
          {loadError && <small>{labels.fallback}</small>}
        </div>

        <div className={`grid-capacity-card ${active.kind}`}>
          <div className="capacity-head">
            <small>{labels.capacity}</small>
            <strong>
              {active.capacity}
              <span>GW</span>
            </strong>
          </div>
          <div
            className="capacity-track"
            style={{ '--capacity-progress': `${active.progress}%` } as CSSProperties}
          >
            <span>
              <i aria-hidden="true" />
              {active.progress}%
            </span>
          </div>
        </div>

        <div className="grid-scene-copy">
          <span>{eyebrow}</span>
          <h3>{title}</h3>
          <p>{body}</p>
        </div>

        <div className="grid-interaction-hint" aria-hidden="true">
          <span />
          {labels.drag}
        </div>

        <div className="webgl-actions" role="tablist" aria-label={labels.steps}>
          {sceneSteps.map((step, index) => (
            <button
              aria-label={`${step.label} ${step.number}`}
              aria-selected={activeStep === index}
              key={`${step.kind}-${step.number}`}
              onClick={() => goToStep(index)}
              role="tab"
              type="button"
            >
              {String(index + 1).padStart(2, '0')}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
