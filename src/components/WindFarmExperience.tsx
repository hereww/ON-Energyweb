'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

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

const markerPositions = [
  new THREE.Vector3(-3.8, 0.62, -1.7),
  new THREE.Vector3(-0.2, 0.58, 1.4),
  new THREE.Vector3(3.4, 0.56, -0.4),
]

const gridVertexShader = `
  varying vec2 vUv;
  uniform float uTime;

  void main() {
    vUv = uv;
    vec3 transformed = position;
    transformed.z += sin(position.x * 1.5 + uTime * 0.65) * 0.03;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`

const gridFragmentShader = `
  varying vec2 vUv;
  uniform float uTime;

  void main() {
    vec2 grid = abs(fract(vUv * 20.0 - 0.5) - 0.5) / fwidth(vUv * 20.0);
    float line = 1.0 - min(min(grid.x, grid.y), 1.0);
    float sweep = smoothstep(0.03, 0.0, abs(vUv.y - fract(uTime * 0.06)));
    vec3 base = vec3(0.018, 0.018, 0.016);
    vec3 glow = vec3(1.0, 0.95, 0.0) * (line * 0.24 + sweep * 0.36);
    gl_FragColor = vec4(base + glow, 1.0);
  }
`

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

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

function createBladeGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.035, 0.02)
  shape.lineTo(0.055, 0.08)
  shape.lineTo(0.028, 0.82)
  shape.lineTo(-0.028, 0.82)
  shape.lineTo(-0.055, 0.08)
  shape.lineTo(-0.035, 0.02)
  return new THREE.ShapeGeometry(shape)
}

function makeTurbine(
  materials: {
    accent: THREE.Material
    blade: THREE.Material
    mast: THREE.Material
  },
  bladeGeometry: THREE.BufferGeometry,
) {
  const turbine = new THREE.Group()

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.09, 2.4, 14), materials.mast)
  mast.position.y = 1.18
  turbine.add(mast)

  const nacelle = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22, 0.26), materials.mast)
  nacelle.position.set(0, 2.42, 0)
  turbine.add(nacelle)

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.08, 18), materials.accent)
  hub.rotation.x = Math.PI / 2
  hub.position.set(0, 2.42, 0.16)
  turbine.add(hub)

  const bladeRoot = new THREE.Group()
  bladeRoot.position.set(0, 2.42, 0.22)

  for (let index = 0; index < 3; index += 1) {
    const blade = new THREE.Mesh(bladeGeometry, materials.blade)
    blade.rotation.z = (Math.PI * 2 * index) / 3
    bladeRoot.add(blade)
  }

  turbine.add(bladeRoot)
  turbine.userData.bladeRoot = bladeRoot

  return turbine
}

export function WindFarmExperience({ body, eyebrow, modes, title }: WindFarmExperienceProps) {
  const [activeMode, setActiveMode] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isReady] = useState(true)
  const webglAvailable = true
  const activeModeRef = useRef(0)
  const dragRef = useRef({ isDragging: false, lastX: 0, lastY: 0 })
  const mountRef = useRef<HTMLDivElement | null>(null)
  const windMixRef = useRef(0)
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
    let renderer: THREE.WebGLRenderer

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: false,
        antialias: true,
        powerPreference: 'high-performance',
      })
    } catch (error) {
      console.error('Wind farm WebGL scene could not start.', error)
      hostElement.dataset.webgl = 'unavailable'
      return
    }

    renderer.setClearColor(0x030303, 1)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    hostElement.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x030303, 0.055)

    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100)
    camera.position.set(0, 5.2, 9.8)
    camera.lookAt(0, 1.0, 0)

    const root = new THREE.Group()
    root.rotation.y = 0.26
    scene.add(root)

    scene.add(new THREE.AmbientLight(0xffffff, 0.58))

    const keyLight = new THREE.DirectionalLight(0xfff200, 2.8)
    keyLight.position.set(-5, 8, 5)
    scene.add(keyLight)

    const rimLight = new THREE.PointLight(0xffffff, 3.4, 18)
    rimLight.position.set(4, 4, 4)
    scene.add(rimLight)

    const gridGeometry = new THREE.PlaneGeometry(15, 11, 84, 64)
    const gridMaterial = new THREE.ShaderMaterial({
      fragmentShader: gridFragmentShader,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: gridVertexShader,
    })
    const grid = new THREE.Mesh(gridGeometry, gridMaterial)
    grid.rotation.x = -Math.PI / 2
    root.add(grid)

    const mastMaterial = new THREE.MeshStandardMaterial({
      color: 0xe7e7df,
      emissive: 0x161600,
      metalness: 0.42,
      roughness: 0.32,
    })
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf7f7ef,
      emissive: 0x111100,
      metalness: 0.18,
      roughness: 0.34,
      side: THREE.DoubleSide,
    })
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff200,
      emissive: 0xfff200,
      emissiveIntensity: 0.7,
      metalness: 0.2,
      roughness: 0.28,
    })
    const darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      emissive: 0x1d1b00,
      metalness: 0.34,
      roughness: 0.4,
    })
    const routeMaterial = new THREE.LineBasicMaterial({
      color: 0xfff200,
      transparent: true,
      opacity: 0.38,
    })
    const pulseMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff200,
      transparent: true,
      opacity: 0.9,
    })
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff200,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    })
    const bladeGeometry = createBladeGeometry()
    const turbineMaterials = { accent: accentMaterial, blade: bladeMaterial, mast: mastMaterial }
    const turbines: THREE.Group[] = []

    const turbineLayout = [
      [-4.4, -2.4, 0.82],
      [-3.0, -1.25, 0.68],
      [-1.8, -2.95, 0.74],
      [1.9, -2.35, 0.76],
      [3.1, -1.05, 0.64],
      [4.25, -2.75, 0.7],
    ] as const

    turbineLayout.forEach(([x, z, scale], index) => {
      const turbine = makeTurbine(turbineMaterials, bladeGeometry)
      turbine.position.set(x, 0, z)
      turbine.scale.setScalar(scale)
      turbine.rotation.y = Math.sin(index) * 0.18
      root.add(turbine)
      turbines.push(turbine)

      const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.66, 52), ringMaterial)
      ring.position.set(x, 0.035, z)
      ring.rotation.x = -Math.PI / 2
      root.add(ring)
    })

    const storageGroup = new THREE.Group()
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const cabinet = new THREE.Mesh(
          new THREE.BoxGeometry(0.46, 0.64, 0.5),
          row === 0 ? mastMaterial : darkMaterial,
        )
        cabinet.position.set(-0.75 + col * 0.56, 0.32, 1.55 + row * 0.58)
        storageGroup.add(cabinet)

        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.035, 0.52), accentMaterial)
        trim.position.set(cabinet.position.x, 0.67, cabinet.position.z)
        storageGroup.add(trim)
      }
    }
    root.add(storageGroup)

    const substation = new THREE.Group()
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.22, 0.9), darkMaterial)
    base.position.y = 0.12
    substation.add(base)
    for (let index = 0; index < 5; index += 1) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 8), mastMaterial)
      post.position.set(-0.5 + index * 0.25, 0.55, 0)
      substation.add(post)
    }
    substation.position.set(3.35, 0, 0.4)
    root.add(substation)

    const routePoints = [
      new THREE.Vector3(-4.0, 0.14, -1.75),
      new THREE.Vector3(-2.0, 0.18, -0.25),
      new THREE.Vector3(-0.15, 0.18, 1.25),
      new THREE.Vector3(1.75, 0.2, 0.95),
      new THREE.Vector3(3.35, 0.2, 0.25),
    ]
    const route = new THREE.CatmullRomCurve3(routePoints)
    const routeGeometry = new THREE.BufferGeometry().setFromPoints(route.getPoints(120))
    const routeLine = new THREE.Line(routeGeometry, routeMaterial)
    root.add(routeLine)

    const routePulse = new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 18), pulseMaterial)
    root.add(routePulse)

    const markerMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff200,
      emissiveIntensity: 0.62,
      roughness: 0.22,
    })
    const markerMeshes: THREE.Object3D[] = markerPositions.map((position) => {
      const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), markerMaterial.clone())
      marker.position.copy(position)
      root.add(marker)
      return marker
    })

    const particlesGeometry = new THREE.BufferGeometry()
    const particlePositions = new Float32Array(420 * 3)
    for (let index = 0; index < 420; index += 1) {
      particlePositions[index * 3] = (Math.random() - 0.5) * 14
      particlePositions[index * 3 + 1] = Math.random() * 4.2 + 0.25
      particlePositions[index * 3 + 2] = (Math.random() - 0.5) * 9
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    const particles = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({
        color: 0xfff200,
        opacity: 0.38,
        size: 0.022,
        transparent: true,
      }),
    )
    root.add(particles)

    const clock = new THREE.Clock()
    const pointer = new THREE.Vector2()
    const raycaster = new THREE.Raycaster()
    let targetRotationX = -0.06
    let targetRotationY = 0.3
    let currentRotationX = targetRotationX
    let currentRotationY = targetRotationY

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

    function activateMode(index: number) {
      activeModeRef.current = index
      setActiveMode(index)
    }

    function setPointerFromEvent(event: MouseEvent | PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    }

    function onPointerDown(event: PointerEvent) {
      dragRef.current = {
        isDragging: true,
        lastX: event.clientX,
        lastY: event.clientY,
      }
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
      targetRotationY += deltaX * 0.004
      targetRotationX = clamp(targetRotationX + deltaY * 0.0025, -0.6, 0.35)
    }

    function onPointerUp(event: PointerEvent) {
      dragRef.current.isDragging = false
      setIsDragging(false)
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId)
      }
    }

    function onClick(event: MouseEvent) {
      if (Math.abs(event.movementX) > 2 || Math.abs(event.movementY) > 2) {
        return
      }

      setPointerFromEvent(event)
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(markerMeshes, false)[0]

      if (!hit) {
        return
      }

      const index = markerMeshes.indexOf(hit.object)
      if (index >= 0) {
        windMixRef.current = markerMeshes.length <= 1 ? 0 : index / (markerMeshes.length - 1)
        activateMode(index)
      }
    }

    function onWheel(event: WheelEvent) {
      windMixRef.current = clamp(windMixRef.current + event.deltaY * 0.0008, 0, 1)
      activateMode(Math.round(windMixRef.current * (modes.length - 1)))
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerUp)
    renderer.domElement.addEventListener('click', onClick)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true })

    const observer = new ResizeObserver(resize)
    observer.observe(hostElement)
    resize()

    function animate() {
      if (destroyed) {
        return
      }

      const elapsed = clock.getElapsedTime()
      const activeIndex = activeModeRef.current
      gridMaterial.uniforms.uTime.value = elapsed
      currentRotationX = THREE.MathUtils.lerp(currentRotationX, targetRotationX, 0.08)
      currentRotationY = THREE.MathUtils.lerp(
        currentRotationY,
        targetRotationY + windMixRef.current * 0.56,
        0.08,
      )
      root.rotation.x = currentRotationX
      root.rotation.y = currentRotationY + Math.sin(elapsed * 0.12) * 0.025
      storageGroup.position.y = Math.sin(elapsed * 0.9) * 0.035
      particles.rotation.y = elapsed * 0.02

      turbines.forEach((turbine, index) => {
        const bladeRoot = turbine.userData.bladeRoot as THREE.Group
        bladeRoot.rotation.z += 0.055 + index * 0.006 + windMixRef.current * 0.06
        turbine.position.y = Math.sin(elapsed * 0.85 + index) * 0.025
      })

      markerMeshes.forEach((marker, index) => {
        const markerMesh = marker as THREE.Mesh<
          THREE.OctahedronGeometry,
          THREE.MeshStandardMaterial
        >
        const isActive = activeIndex === index
        marker.scale.setScalar(isActive ? 1.42 + Math.sin(elapsed * 4) * 0.08 : 0.96)
        marker.position.y = markerPositions[index].y + Math.sin(elapsed * 2 + index) * 0.045
        markerMesh.material.color.set(isActive ? '#fff200' : '#ffffff')
        markerMesh.material.emissiveIntensity = isActive ? 1.2 : 0.55
      })

      const pulsePoint = route.getPoint((elapsed * 0.13 + windMixRef.current * 0.33) % 1)
      routePulse.position.copy(pulsePoint)

      camera.position.x = Math.sin(elapsed * 0.15) * 0.2
      camera.lookAt(0, 0.85, 0)
      renderer.render(scene, camera)
      frameId = window.requestAnimationFrame(animate)
    }

    animate()

    return () => {
      destroyed = true
      window.cancelAnimationFrame(frameId)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPointerUp)
      renderer.domElement.removeEventListener('click', onClick)
      renderer.domElement.removeEventListener('wheel', onWheel)
      if (renderer.domElement.parentElement === hostElement) {
        hostElement.removeChild(renderer.domElement)
      }
      renderer.dispose()
      gridGeometry.dispose()
      gridMaterial.dispose()
      bladeGeometry.dispose()
      particlesGeometry.dispose()
      routeGeometry.dispose()
      mastMaterial.dispose()
      bladeMaterial.dispose()
      accentMaterial.dispose()
      darkMaterial.dispose()
      routeMaterial.dispose()
      pulseMaterial.dispose()
      ringMaterial.dispose()
      markerMeshes.forEach((marker) => {
        const markerMesh = marker as THREE.Mesh<THREE.BufferGeometry, THREE.Material>
        markerMesh.geometry.dispose()
        markerMesh.material.dispose()
      })
    }
  }, [modes.length])

  const active = modes[activeMode] ?? modes[0]

  return (
    <section className="wind-experience" id="wind">
      <div
        className="wind-stage"
        data-dragging={isDragging ? 'true' : 'false'}
        data-webgl={webglAvailable ? 'available' : 'unavailable'}
        ref={setMountRef}
      />
      <div className="wind-reference-image" aria-hidden="true" />
      <div className="wind-copy">
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
      <div className="wind-panel" data-ready={isReady ? 'true' : 'false'}>
        <small>{active.label}</small>
        <strong>{active.metric}</strong>
        <p>{active.body}</p>
        <div className="wind-actions" role="tablist" aria-label="Wind farm scene modes">
          {modes.map((mode, index) => (
            <button
              aria-selected={activeMode === index}
              key={mode.label}
              onClick={() => {
                windMixRef.current = modes.length <= 1 ? 0 : index / (modes.length - 1)
                activeModeRef.current = index
                setActiveMode(index)
              }}
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
