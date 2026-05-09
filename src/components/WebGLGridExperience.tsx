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

type MotionPathPoint = {
  key: string
  targetKey?: string
  zoom: number
  duration: number
  hold: number
}

type MotionSegment = {
  curveProgressEnd: number
  curveProgressStart: number
  endTime: number
  positionIndex: number
  startTime: number
  type: 'transition' | 'hold'
}

type CameraRail = {
  duration: number
  positionCurve: THREE.CatmullRomCurve3
  segments: MotionSegment[]
  targetCurve: THREE.CatmullRomCurve3
  timeline: MotionPathPoint[]
}

type PowerlineUniforms = {
  uColor1: { value: THREE.Color }
  uColor2: { value: THREE.Color }
  uDirection: { value: number }
  uOpacity: { value: number }
  uSpeed: { value: number }
  uTime: { value: number }
  uTransition: { value: number }
  uUvOffset: { value: THREE.Vector2 }
  uUvScale: { value: number }
}

type PowerlineMaterial = THREE.ShaderMaterial & {
  uniforms: PowerlineUniforms
}

type PowerlineRuntime = {
  initiallyHidden: boolean
  material: PowerlineMaterial
  mesh: THREE.Mesh
}

type BatteryRuntime = {
  initiallyHidden: boolean
  isolated: boolean
  object: THREE.Object3D
  originalY: number
}

type StorageCellUniforms = {
  uAxisMax: { value: number }
  uAxisMin: { value: number }
  uChargedColor: { value: THREE.Color }
  uEmptyColor: { value: THREE.Color }
  uFill: { value: number }
  uGlowColor: { value: THREE.Color }
  uPulse: { value: number }
}

type StorageCellMaterial = THREE.ShaderMaterial & {
  uniforms: StorageCellUniforms
}

type StorageCellRuntime = {
  material: StorageCellMaterial
  mesh: THREE.Mesh
  originalPosition: THREE.Vector3
  originalQuaternion: THREE.Quaternion
  originalScale: THREE.Vector3
}

type StorageObjectRuntime = {
  object: THREE.Object3D
  originalPosition: THREE.Vector3
  originalQuaternion: THREE.Quaternion
  originalScale: THREE.Vector3
}

type StorageCloseupRuntime = {
  arrowIcons: StorageObjectRuntime[]
  camera: THREE.Camera | null
  lineObjects: StorageObjectRuntime[]
  powerIcons: StorageObjectRuntime[]
  root: THREE.Object3D
  rootPosition: THREE.Vector3
  rootQuaternion: THREE.Quaternion
  rootScale: THREE.Vector3
  yellowCells: StorageCellRuntime[]
}

type TurbineRotor = {
  object: THREE.Object3D
  speed: number
}

type CarMover = {
  update: (delta: number) => void
}

type CarRouteMatch = {
  direction: 1 | -1
  distance: number
  point: THREE.Vector3
  route: THREE.Vector3[]
  segmentIndex: number
}

type StorageChargeOverlayState = {
  charge: number
  closeup: number
}

const CITY_GLB_PATH = '/assets/webgl/gltf/city.glb'
const DRACO_PATH = '/assets/webgl/libs/draco/gltf/'
const BASIS_PATH = '/assets/webgl/libs/basis/'
const CITY_TEXTURE_PATHS = {
  '00_floor_city': {
    desktop: '/assets/webgl/textures/desktop/city-floor-city.ktx2',
    mobile: '/assets/webgl/textures/mobile/city-floor-city.ktx2',
  },
  '00_floor_data_center': {
    desktop: '/assets/webgl/textures/desktop/city-floor-data-center.ktx2',
    mobile: '/assets/webgl/textures/mobile/city-floor-data-center.ktx2',
  },
  floor: {
    desktop: '/assets/webgl/textures/desktop/city-floor-closeup.ktx2',
    mobile: '/assets/webgl/textures/mobile/city-floor-closeup.ktx2',
  },
} as const

const CITY_CAMERA_START: MotionPathPoint = { key: 'Camera_01_city_01', zoom: 4, duration: 0, hold: 0 }
const CITY_CAMERA_PATH: MotionPathPoint[] = [
  { key: 'Camera_01_city_01', zoom: 8, duration: 1, hold: 0 },
  { key: 'Camera_01_city_01', zoom: 12, duration: 6, hold: 0 },
  { key: 'Camera_01_city_02_zoom', zoom: 20, duration: 3, hold: 0 },
  { key: 'Camera_01_city_02_zoom', zoom: 80, duration: 3, hold: 0 },
  { key: 'Camera_01_city_02_zoom', zoom: 200, duration: 1, hold: 10 },
  { key: 'Camera_01_city_02_zoom', zoom: 20, duration: 3, hold: 0 },
  { key: 'Camera_01_city_03_WIND_SOLAR', zoom: 14, duration: 6, hold: 0 },
  { key: 'Camera_01_city_03_WIND_SOLAR', zoom: 14, duration: 6, hold: 0 },
  { key: 'Camera_01_city_01', zoom: 7, duration: 4, hold: 0 },
  { key: 'Camera_01_city_01', zoom: 7, duration: 4, hold: 0 },
]

const CITY_FLOOR_KEYS = ['00_floor_city', '00_floor_data_center']
const CITY_TURBINE_KEYS = ['WIND', 'WIND001', 'WIND002', 'WIND003', 'WIND004', 'WIND005']
const CITY_CAR_KEYS = ['CAR005', 'CAR006', 'CAR007', 'CAR008', 'CAR009', 'CAR010', 'CAR011']
const CITY_BRIDGE_DECK_Y = 0.1248665302991867
const CITY_CAR_ROUTE_Y_OFFSET = 0.012259140610694885
const CITY_BRIDGE_ROUTE_Y = CITY_BRIDGE_DECK_Y + CITY_CAR_ROUTE_Y_OFFSET
const CITY_CAR_ROUTES = [
  ['waypoint001', 'waypoint002', 'waypoint003'],
  ['waypoint004', 'waypoint005', 'waypoint006', 'waypoint007', 'waypoint008', 'waypoint009'],
  [
    'waypoint010',
    'waypoint011',
    'waypoint012',
    'waypoint013',
    'waypoint014',
    'waypoint015',
    'waypoint016',
    'waypoint017',
  ],
  ['waypoint018', 'waypoint019', 'waypoint020', 'waypoint021', 'waypoint022', 'waypoint023', 'waypoint024', 'waypoint025'],
]
// The left approach road is a road mesh only, without waypoint helper nodes in the GLB.
const CITY_CAR_STATIC_ROUTES = [
  [
    new THREE.Vector3(14.56, CITY_BRIDGE_ROUTE_Y, 7.27),
    new THREE.Vector3(19.56, CITY_BRIDGE_ROUTE_Y, 7.27),
    new THREE.Vector3(20.04, CITY_BRIDGE_ROUTE_Y, 7.74),
    new THREE.Vector3(20.04, CITY_BRIDGE_ROUTE_Y, 10.74),
    new THREE.Vector3(19.86, CITY_BRIDGE_ROUTE_Y, 11.25),
    new THREE.Vector3(16.39, CITY_BRIDGE_ROUTE_Y, 14.9),
    new THREE.Vector3(16.31, CITY_BRIDGE_ROUTE_Y, 23.9),
  ],
]

const CITY_BATTERY_SETS = [
  [
    'CITY_BATTERIES_WIND_SOLAR011',
    'CITY_BATTERIES_WIND_SOLAR012',
    'CITY_BATTERIES_WIND_SOLAR013',
    'CITY_BATTERIES_WIND_SOLAR014',
    'CITY_BATTERIES_WIND_SOLAR015',
    'CITY_BATTERIES_WIND_SOLAR016',
    'CITY_BATTERIES_WIND_SOLAR017',
    'CITY_BATTERIES_WIND_SOLAR018',
    'CITY_BATTERIES_WIND_SOLAR019',
    'CITY_BATTERIES_WIND_SOLAR020',
  ],
  [
    'CITY_BATTIES_01',
    'CITY_BATTIES_01001',
    'CITY_BATTIES_01002',
    'CITY_BATTIES_01003',
    'CITY_BATTIES_01004',
    'CITY_BATTIES_01005',
    'CITY_BATTIES_01006',
    'CITY_BATTIES_01007',
    'CITY_BATTIES_01008',
    'CITY_BATTIES_01009',
  ],
  [
    'CITY_BATTIES_02',
    'CITY_BATTIES_02001',
    'CITY_BATTIES_02002',
    'CITY_BATTIES_02003',
    'CITY_BATTIES_02004',
    'CITY_BATTIES_02005',
    'CITY_BATTIES_02006',
    'CITY_BATTIES_02007',
    'CITY_BATTIES_02008',
    'CITY_BATTIES_02009',
  ],
  [
    'CITY_BATTIES_03',
    'CITY_BATTIES_03001',
    'CITY_BATTIES_03002',
    'CITY_BATTIES_03003',
    'CITY_BATTIES_03004',
    'CITY_BATTIES_03005',
    'CITY_BATTIES_03006',
    'CITY_BATTIES_03007',
    'CITY_BATTIES_03008',
    'CITY_BATTIES_03009',
  ],
  [
    'CITY_BATTIES_04',
    'CITY_BATTIES_04001',
    'CITY_BATTIES_04002',
    'CITY_BATTIES_04003',
    'CITY_BATTIES_04004',
    'CITY_BATTIES_04005',
    'CITY_BATTIES_04006',
    'CITY_BATTIES_04007',
    'CITY_BATTIES_04008',
    'CITY_BATTIES_04009',
  ],
]

const CITY_WIND_SOLAR_BATTERIES = new Set(CITY_BATTERY_SETS[0].map(normalizeName))
const CITY_ISOLATED_BATTERIES = new Set(CITY_BATTERY_SETS[3].map(normalizeName))
const CITY_POWERLINE_KEYS = new Set(['line', 'line002', 'line003', 'line005', 'line006', 'line008', 'line010'].map(normalizeName))
const CITY_HIDDEN_POWERLINES = new Set(['line002', 'line003'].map(normalizeName))
const CITY_FORCE_BASIC_COLOR_KEYS = new Set(['ROAD_COLOR:D4D4D4'].map(normalizeName))
const CITY_CAR_ROUTE_SNAP_MAX_DISTANCE = 1
const CITY_CAR_LOOK_AXIS = new THREE.Vector3(0, 0, -1)
const CITY_POWERLINE_MESH_CONFIG = new Map(
  [
    ['line002', { depthWrite: true, direction: -1, yOffset: 0.001 }],
    ['line005', { depthWrite: true, direction: -1, yOffset: 0 }],
  ].map(([key, config]) => [normalizeName(key as string), config as { depthWrite: boolean; direction: number; yOffset: number }]),
)
const CITY_CLOSEUP_HIGH_CELLS = new Set(['Cubes_yellow'].map(normalizeName))
const CITY_CLOSEUP_LOW_CELLS = new Set(['cubes_green'].map(normalizeName))
const CITY_CLOSEUP_LOW_OUTLINES = new Set(['cubes_green_outline_color000000'].map(normalizeName))
const CITY_CLOSEUP_LINE_KEYS = new Set(['line001'].map(normalizeName))
const CITY_CLOSEUP_ROOT_KEY = 'city-close-up'
const CITY_CLOSEUP_CAMERA_KEY = 'Camera_close_up'
const CITY_CLOSEUP_ARROW_KEYS = ['ArrowIcon000', 'ArrowIcon001', 'ArrowIcon002', 'ArrowIcon003']
const CITY_CLOSEUP_POWER_KEYS = ['PowerIcon000', 'PowerIcon001']
const STORAGE_STEP_INDEX = 1
const WIND_STEP_INDEX = 2
const STORAGE_NAVIGATION_PHASE = 0.58
const STORAGE_INSERT_END = 0.82
const STORAGE_CHARGE_ENTER_END = 0.28
const STORAGE_CHARGE_EXIT_START = 0.7
const STORAGE_CHARGE_EXIT_END = STORAGE_INSERT_END
const STORAGE_CLOSEUP_SWITCH_IN = 0.04
const STORAGE_CLOSEUP_SWITCH_OUT = 0.74
const STORAGE_PROGRESS_STIFFNESS = 6.5
const STORAGE_CLOSEUP_ZOOM = 128
const STORAGE_CELL_EMPTY_COLOR = new THREE.Color(0xffa28a)
const STORAGE_CELL_CHARGED_COLOR = new THREE.Color(0xfff313)
const STORAGE_CELL_GLOW_COLOR = new THREE.Color(0xfff7a6)
const STORAGE_CELL_VERTEX_SHADER = `
  varying vec3 vLocalPosition;

  void main() {
    vLocalPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const STORAGE_CELL_FRAGMENT_SHADER = `
  precision highp float;

  uniform vec3 uEmptyColor;
  uniform vec3 uChargedColor;
  uniform vec3 uGlowColor;
  uniform float uFill;
  uniform float uPulse;
  uniform float uAxisMin;
  uniform float uAxisMax;

  varying vec3 vLocalPosition;

  void main() {
    float axisProgress = smoothstep(uAxisMin, uAxisMax, vLocalPosition.x);
    float filled = smoothstep(axisProgress - 0.08, axisProgress + 0.08, uFill);
    float activeEdge = 1.0 - smoothstep(0.0, 0.12, abs(axisProgress - uFill));
    vec3 color = mix(uEmptyColor, uChargedColor, filled);
    color = mix(color, uGlowColor, activeEdge * uPulse * 0.38);
    gl_FragColor = vec4(color, 1.0);
  }
`

const POWERLINE_BAD = {
  color1: new THREE.Color(0xf14d3d),
  color2: new THREE.Color(0xc4b82b),
  speed: 0.58,
  uvScale: 3,
}

const POWERLINE_GOOD = {
  color1: new THREE.Color(0xfff313),
  color2: new THREE.Color(0xc0b800),
  speed: 0.5,
  uvScale: 3,
}

const POWERLINE_VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
    vUv = uv;
  }
`

const CITY_BAKED_TONE_VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const CITY_BAKED_TONE_FRAGMENT_SHADER = `
  precision highp float;

  uniform sampler2D uMap;
  uniform float uOpacity;

  varying vec2 vUv;

  void main() {
    vec4 texel = texture2D(uMap, vUv);
    float luma = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
    float tonalStep = pow(smoothstep(0.0, 0.9, luma), 0.36);
    vec3 gray = mix(vec3(0.38), vec3(0.96), tonalStep);

    if (luma < 0.018) {
      gray = vec3(0.24);
    }

    gl_FragColor = vec4(gray, texel.a * uOpacity);
  }
`

const POWERLINE_FRAGMENT_SHADER = `
  precision highp float;

  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uDirection;
  uniform float uOpacity;
  uniform float uUvScale;
  uniform vec2 uUvOffset;
  uniform float uTransition;

  varying vec2 vUv;

  void main() {
    if (uDirection > 0.0 && vUv.y < 1.0 - uTransition) {
      discard;
    } else if (uDirection < 0.0 && vUv.y > uTransition) {
      discard;
    }

    float wave = 0.5 + 0.5 * sin((uUvOffset.y + vUv.y) * uUvScale + uTime * uSpeed * uDirection);
    float energy = 0.28 + wave * 0.46;
    gl_FragColor = vec4(mix(uColor1, uColor2, energy), uOpacity);
  }
`

const pinPositions = [
  { x: 79, y: 77 },
  { x: 57, y: 45 },
  { x: 50, y: 43 },
  { x: 63, y: 52 },
  { x: 70, y: 56 },
  { x: 72, y: 58 },
]

const originalVisibleRanges = [
  [0.0512472380050505, 0.12776238952020202],
  [0.13730784406565658, 0.2658431976010101],
  [0.28644925820707073, 0.43498461174242425],
  [0.44947956123737376, 0.6752371369949495],
  [0.7601866319444445, 0.965],
  [0.973, 0.9999593592171717],
]

const CAMERA_EASING_STIFFNESS = 6.5
const CAMERA_PROGRESS_BY_STEP = [0.09, 0.36, 0.827, 0.84, 0.87, 0.95]
const CAMERA_ENTRY_TRANSITION_START = 0.34
const CAMERA_SCARCITY_TRANSITION_START = 0.72
const CAMERA_FINAL_TRANSITION_START = 0.88
const SCENE_NAVIGATION_DURATION_MS = 1700

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

function exponentialDamp(current: number, target: number, stiffness: number, delta: number) {
  return current + (target - current) * (1 - Math.exp(-stiffness * delta))
}

function easeInOutQuad(value: number) {
  const nextValue = clamp(value, 0, 1)
  return nextValue < 0.5 ? 2 * nextValue * nextValue : 1 - Math.pow(-2 * nextValue + 2, 2) / 2
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const nextValue = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1)
  return nextValue * nextValue * (3 - 2 * nextValue)
}

function getVisibleRangeIndex(progress: number, stepCount: number) {
  const lastIndex = Math.max(0, Math.min(stepCount, originalVisibleRanges.length) - 1)

  if (lastIndex >= WIND_STEP_INDEX) {
    const storageScroll = getStepScrollProgress(STORAGE_STEP_INDEX, stepCount)
    const windScroll = getStepScrollProgress(WIND_STEP_INDEX, stepCount)
    const storageInsertEnd = storageScroll + (windScroll - storageScroll) * STORAGE_INSERT_END

    if (progress > storageScroll && progress < storageInsertEnd) {
      return STORAGE_STEP_INDEX
    }
  }

  for (let index = 0; index <= lastIndex; index += 1) {
    const range = originalVisibleRanges[index]

    if (!range) {
      continue
    }

    const [start, end] = range
    const nextStart = originalVisibleRanges[index + 1]?.[0]

    if (progress < start) {
      return index
    }

    if (progress <= end) {
      return index
    }

    if (typeof nextStart === 'number' && progress < nextStart) {
      return progress < (end + nextStart) / 2 ? index : Math.min(index + 1, lastIndex)
    }
  }

  return lastIndex
}

function getStepScrollProgress(index: number, stepCount: number) {
  const range = originalVisibleRanges[index]

  if (range) {
    return (range[0] + range[1]) / 2
  }

  return clamp(index / Math.max(1, stepCount - 1), 0, 1)
}

function getNavigationStepProgress(index: number, stepCount: number) {
  const lastIndex = Math.max(0, Math.min(stepCount, originalVisibleRanges.length) - 1)

  if (lastIndex === 0) {
    return getStepScrollProgress(0, stepCount)
  }

  if (index === STORAGE_STEP_INDEX && lastIndex >= WIND_STEP_INDEX) {
    const storageScroll = getStepScrollProgress(STORAGE_STEP_INDEX, stepCount)
    const windScroll = getStepScrollProgress(WIND_STEP_INDEX, stepCount)
    return storageScroll + (windScroll - storageScroll) * STORAGE_NAVIGATION_PHASE
  }

  return getStepScrollProgress(index, stepCount)
}

function getNavigationDurationMs(startProgress: number, endProgress: number) {
  const distance = Math.abs(endProgress - startProgress)
  return clamp(distance * 5400, 820, SCENE_NAVIGATION_DURATION_MS)
}

function getCameraProgressFromScroll(progress: number, stepCount: number) {
  const lastIndex = Math.max(0, Math.min(stepCount, originalVisibleRanges.length) - 1)
  const firstCameraProgress = CAMERA_PROGRESS_BY_STEP[0] ?? 0

  if (lastIndex === 0) {
    return firstCameraProgress
  }

  for (let index = 0; index <= lastIndex; index += 1) {
    const currentScroll = getStepScrollProgress(index, stepCount)
    const currentCamera = CAMERA_PROGRESS_BY_STEP[index] ?? clamp(index / lastIndex, 0, 1)

    if (index === 0 && progress <= currentScroll) {
      return currentCamera
    }

    const nextScroll = getStepScrollProgress(index + 1, stepCount)
    const nextCamera = CAMERA_PROGRESS_BY_STEP[index + 1] ?? currentCamera

    if (progress <= nextScroll) {
      let localProgress = clamp((progress - currentScroll) / Math.max(0.0001, nextScroll - currentScroll), 0, 1)

      if (index === 0) {
        if (localProgress < CAMERA_ENTRY_TRANSITION_START) {
          return currentCamera
        }

        localProgress = clamp(
          (localProgress - CAMERA_ENTRY_TRANSITION_START) / Math.max(0.0001, 1 - CAMERA_ENTRY_TRANSITION_START),
          0,
          1,
        )
      } else if (index === 2) {
        if (localProgress < CAMERA_SCARCITY_TRANSITION_START) {
          return currentCamera
        }

        localProgress = clamp(
          (localProgress - CAMERA_SCARCITY_TRANSITION_START) / Math.max(0.0001, 1 - CAMERA_SCARCITY_TRANSITION_START),
          0,
          1,
        )
      } else if (index + 1 === lastIndex) {
        if (localProgress < CAMERA_FINAL_TRANSITION_START) {
          return currentCamera
        }

        localProgress = clamp(
          (localProgress - CAMERA_FINAL_TRANSITION_START) / Math.max(0.0001, 1 - CAMERA_FINAL_TRANSITION_START),
          0,
          1,
        )
      }

      if (index === STORAGE_STEP_INDEX && index + 1 === WIND_STEP_INDEX) {
        if (localProgress < STORAGE_INSERT_END) {
          return currentCamera
        }

        localProgress = clamp((localProgress - STORAGE_INSERT_END) / Math.max(0.0001, 1 - STORAGE_INSERT_END), 0, 1)
      }

      return currentCamera + (nextCamera - currentCamera) * easeInOutQuad(localProgress)
    }
  }

  return CAMERA_PROGRESS_BY_STEP[lastIndex] ?? 1
}

function getStorageScrollPhase(progress: number, stepCount: number) {
  if (stepCount <= STORAGE_STEP_INDEX) {
    return null
  }

  const storageScroll = getStepScrollProgress(STORAGE_STEP_INDEX, stepCount)
  const windScroll = getStepScrollProgress(WIND_STEP_INDEX, stepCount)

  if (progress <= storageScroll || progress >= windScroll) {
    return null
  }

  return clamp((progress - storageScroll) / Math.max(0.0001, windScroll - storageScroll), 0, 1)
}

function getStorageChargeOverlayState(progress: number, stepCount: number): StorageChargeOverlayState {
  const storagePhase = getStorageScrollPhase(progress, stepCount)

  if (storagePhase === null || storagePhase >= STORAGE_INSERT_END) {
    return {
      charge: storagePhase === null ? 0 : 1,
      closeup: 0,
    }
  }

  const charge = smoothstep(STORAGE_CHARGE_ENTER_END, STORAGE_CHARGE_EXIT_START, storagePhase)
  const closeup =
    smoothstep(STORAGE_CLOSEUP_SWITCH_IN, STORAGE_CHARGE_ENTER_END, storagePhase) *
    (1 - smoothstep(STORAGE_CLOSEUP_SWITCH_OUT, STORAGE_CHARGE_EXIT_END, storagePhase))

  return {
    charge,
    closeup,
  }
}

function normalizeName(name: string) {
  return name.replace(/[._:]/g, '').toUpperCase()
}

function normalizeKeys(keys: string[]) {
  return keys.map(normalizeName)
}

function getNamedObjects(root: THREE.Object3D, keys: string[]) {
  const normalizedKeys = new Set(normalizeKeys(keys))
  const objects: THREE.Object3D[] = []

  root.traverse((object) => {
    if (normalizedKeys.has(normalizeName(object.name))) {
      objects.push(object)
    }
  })

  return objects
}

function getFirstNamedObject(root: THREE.Object3D, key: string) {
  return getNamedObjects(root, [key])[0] ?? null
}

function extractColorFromName(name: string) {
  const match = name.match(/(?:COLOR:?|_COLOR:?|_color:?)([0-9a-fA-F]{6})/)
  return match?.[1] ? `#${match[1]}` : null
}

function setMeshMaterialColor(mesh: THREE.Mesh, color: string, opacity = 1, forceBasic = false) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]

  materials.forEach((material, index) => {
    const textureMap = 'map' in material && material.map instanceof THREE.Texture ? material.map : null
    const nextMaterial =
      forceBasic || material instanceof THREE.MeshBasicMaterial
        ? new THREE.MeshBasicMaterial({
            color,
            map: textureMap,
            opacity,
            side: THREE.DoubleSide,
            transparent: opacity < 1,
          })
        : material

    if ('color' in nextMaterial && nextMaterial.color instanceof THREE.Color) {
      nextMaterial.color.set(color)
    }

    if ('metalness' in nextMaterial) {
      nextMaterial.metalness = 0.03
    }

    if ('roughness' in nextMaterial) {
      nextMaterial.roughness = 0.78
    }

    if ('transparent' in nextMaterial) {
      nextMaterial.transparent = opacity < 1
    }

    if ('opacity' in nextMaterial) {
      nextMaterial.opacity = opacity
    }

    if ('side' in nextMaterial) {
      nextMaterial.side = THREE.DoubleSide
    }

    if (nextMaterial !== material) {
      if (Array.isArray(mesh.material)) {
        mesh.material[index] = nextMaterial
      } else {
        mesh.material = nextMaterial
      }
    }
  })
}

function setMeshTextureMaterial(mesh: THREE.Mesh, texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.flipY = false
  texture.needsUpdate = true
  mesh.material = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    map: texture,
    side: THREE.DoubleSide,
  })
}

function getMaterialTexture(material: THREE.Material) {
  const materialWithMaps = material as THREE.Material & {
    emissiveMap?: THREE.Texture | null
    map?: THREE.Texture | null
  }

  return materialWithMaps.emissiveMap instanceof THREE.Texture
    ? materialWithMaps.emissiveMap
    : materialWithMaps.map instanceof THREE.Texture
      ? materialWithMaps.map
      : null
}

function createCityBakedToneMaterial(texture: THREE.Texture, opacity = 1) {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.flipY = false
  texture.needsUpdate = true

  return new THREE.ShaderMaterial({
    depthWrite: true,
    fragmentShader: CITY_BAKED_TONE_FRAGMENT_SHADER,
    side: THREE.DoubleSide,
    transparent: opacity < 1,
    uniforms: {
      uMap: { value: texture },
      uOpacity: { value: opacity },
    },
    vertexShader: CITY_BAKED_TONE_VERTEX_SHADER,
  })
}

function setCityBakedToneMaterial(mesh: THREE.Mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]

  materials.forEach((material, index) => {
    const texture = getMaterialTexture(material)
    const opacity = 'opacity' in material && typeof material.opacity === 'number' ? material.opacity : 1
    const nextMaterial = texture
      ? createCityBakedToneMaterial(texture, opacity)
      : new THREE.MeshBasicMaterial({
          color: '#b8b8b8',
          opacity,
          side: THREE.DoubleSide,
          transparent: opacity < 1,
        })

    if (Array.isArray(mesh.material)) {
      mesh.material[index] = nextMaterial
    } else {
      mesh.material = nextMaterial
    }
  })
}

function preserveOriginalCityMaterial(mesh: THREE.Mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]

  materials.forEach((material) => {
    if ('side' in material) {
      material.side = THREE.DoubleSide
    }

    if ('metalness' in material) {
      material.metalness = 0
    }

    if ('roughness' in material) {
      material.roughness = 0.9
    }

    if ('map' in material && material.map instanceof THREE.Texture) {
      material.map.colorSpace = THREE.SRGBColorSpace
      material.map.flipY = false
      material.map.needsUpdate = true
    }
  })
}

function createStorageCellMaterial(mesh: THREE.Mesh): StorageCellMaterial {
  mesh.geometry.computeBoundingBox()
  const box = mesh.geometry.boundingBox
  const axisMin = box?.min.x ?? -1
  const axisMax = box?.max.x ?? 1

  return new THREE.ShaderMaterial({
    depthWrite: true,
    fragmentShader: STORAGE_CELL_FRAGMENT_SHADER,
    side: THREE.DoubleSide,
    transparent: false,
    uniforms: {
      uAxisMax: { value: axisMax },
      uAxisMin: { value: axisMin },
      uChargedColor: { value: STORAGE_CELL_CHARGED_COLOR.clone() },
      uEmptyColor: { value: STORAGE_CELL_EMPTY_COLOR.clone() },
      uFill: { value: 0 },
      uGlowColor: { value: STORAGE_CELL_GLOW_COLOR.clone() },
      uPulse: { value: 0 },
    },
    vertexShader: STORAGE_CELL_VERTEX_SHADER,
  }) as StorageCellMaterial
}

function createStorageObjectRuntime(object: THREE.Object3D): StorageObjectRuntime {
  return {
    object,
    originalPosition: object.position.clone(),
    originalQuaternion: object.quaternion.clone(),
    originalScale: object.scale.clone(),
  }
}

function restoreStorageObject(runtime: StorageObjectRuntime) {
  runtime.object.position.copy(runtime.originalPosition)
  runtime.object.quaternion.copy(runtime.originalQuaternion)
  runtime.object.scale.copy(runtime.originalScale)
}

function createCurvePoints(points: THREE.Vector3[]) {
  const curvePoints: THREE.Vector3[] = []
  const up = new THREE.Vector3(0, 1, 0)

  points.forEach((point, index) => {
    curvePoints.push(point.clone())

    if (index >= points.length - 1) {
      return
    }

    const nextPoint = points[index + 1]

    if (!nextPoint) {
      return
    }

    const midpoint = new THREE.Vector3().lerpVectors(point, nextPoint, 0.5)

    if (point.equals(nextPoint)) {
      curvePoints.push(midpoint)
      return
    }

    const delta = new THREE.Vector3().subVectors(nextPoint, point)
    const side = new THREE.Vector3().crossVectors(delta, up)

    if (side.lengthSq() < 0.000001) {
      side.set(1, 0, 0)
    } else {
      side.normalize()
    }

    curvePoints.push(midpoint.add(side.multiplyScalar(delta.length() * 0.15)))
  })

  return curvePoints.length > 1 ? curvePoints : [new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]
}

function buildCameraRail(root: THREE.Object3D, center: THREE.Vector3): CameraRail | null {
  const floorObjects = getNamedObjects(root, CITY_FLOOR_KEYS)
  const raycaster = new THREE.Raycaster()
  const positionPoints: THREE.Vector3[] = []
  const targetPoints: THREE.Vector3[] = []
  const timeline = [CITY_CAMERA_START, ...CITY_CAMERA_PATH]

  function addPoint(point: Pick<MotionPathPoint, 'key' | 'targetKey' | 'zoom'>) {
    const { key, targetKey, zoom } = point
    const cameraObject = getFirstNamedObject(root, key)

    if (!cameraObject) {
      return
    }

    cameraObject.updateMatrixWorld(true)
    positionPoints.push(cameraObject.position.clone().sub(center))

    const targetObject = targetKey ? getFirstNamedObject(root, targetKey) : null
    let lookAt = new THREE.Vector3(22.3, 0, 8.8).sub(center)

    if (targetObject) {
      targetObject.updateMatrixWorld(true)
      targetObject.getWorldPosition(lookAt)
      lookAt.sub(center)
    } else if (cameraObject instanceof THREE.Camera && floorObjects.length > 0) {
      raycaster.setFromCamera(new THREE.Vector2(0, 0), cameraObject)
      const hit = raycaster.intersectObjects(floorObjects, false)[0]

      if (hit) {
        lookAt = hit.point.clone().sub(center)
      }
    } else {
      const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraObject.quaternion)
      lookAt = cameraObject.position.clone().add(direction.multiplyScalar(30)).sub(center)
    }

    targetPoints.push(lookAt)
    cameraObject.userData.originalZoom = zoom
  }

  timeline.forEach((point) => addPoint(point))

  if (positionPoints.length < 2 || targetPoints.length < 2) {
    return null
  }

  const segments: MotionSegment[] = []
  let duration = 0
  const lastTimelineIndex = Math.max(1, timeline.length - 1)

  CITY_CAMERA_PATH.forEach((point, index) => {
    const endIndex = index + 1
    const startIndex = endIndex - 1
    const startProgress = startIndex / lastTimelineIndex
    const curveProgress = endIndex / lastTimelineIndex
    const transitionDuration = point.duration || 1
    segments.push({
      curveProgressEnd: curveProgress,
      curveProgressStart: startProgress,
      endTime: duration + transitionDuration,
      positionIndex: startIndex,
      startTime: duration,
      type: 'transition',
    })
    duration += transitionDuration

    if (point.hold > 0) {
      segments.push({
        curveProgressEnd: curveProgress,
        curveProgressStart: curveProgress,
        endTime: duration + point.hold,
        positionIndex: endIndex,
        startTime: duration,
        type: 'hold',
      })
      duration += point.hold
    }
  })

  return {
    duration,
    positionCurve: new THREE.CatmullRomCurve3(createCurvePoints(positionPoints), false, 'centripetal', 0.5),
    segments,
    targetCurve: new THREE.CatmullRomCurve3(createCurvePoints(targetPoints), false, 'centripetal', 0.5),
    timeline,
  }
}

function sampleCameraRail(progress: number, rail: CameraRail) {
  const pathProgress = clamp(progress, 0, 1)

  if (rail.duration <= 0 || rail.segments.length === 0) {
    return {
      curveProgress: pathProgress,
      zoom: rail.timeline[0]?.zoom ?? 8,
    }
  }

  const time = pathProgress * rail.duration
  const segment =
    rail.segments.find((item) => time >= item.startTime && time < item.endTime) ??
    rail.segments[rail.segments.length - 1]

  if (!segment) {
    return {
      curveProgress: pathProgress,
      zoom: rail.timeline[0]?.zoom ?? 8,
    }
  }

  if (segment.type === 'hold') {
    return {
      curveProgress: segment.curveProgressEnd,
      zoom: rail.timeline[segment.positionIndex]?.zoom ?? rail.timeline[0]?.zoom ?? 8,
    }
  }

  const localDuration = Math.max(0.0001, segment.endTime - segment.startTime)
  const localProgress = clamp((time - segment.startTime) / localDuration, 0, 1)
  const startZoom = rail.timeline[segment.positionIndex]?.zoom ?? rail.timeline[0]?.zoom ?? 8
  const endZoom = rail.timeline[segment.positionIndex + 1]?.zoom ?? startZoom

  return {
    curveProgress:
      segment.curveProgressStart +
      (segment.curveProgressEnd - segment.curveProgressStart) * localProgress,
    zoom: startZoom + (endZoom - startZoom) * localProgress,
  }
}

function getClosestRouteMatch(position: THREE.Vector3, routes: THREE.Vector3[][]): CarRouteMatch | null {
  let bestMatch: CarRouteMatch | null = null

  routes.forEach((route) => {
    if (route.length < 2) {
      return
    }

    for (let index = 0; index < route.length - 1; index += 1) {
      const start = route[index]
      const end = route[index + 1]

      if (!start || !end) {
        continue
      }

      const segment = new THREE.Vector3(end.x - start.x, 0, end.z - start.z)
      const segmentLengthSq = segment.lengthSq()

      if (segmentLengthSq < 0.000001) {
        continue
      }

      const t = clamp(((position.x - start.x) * segment.x + (position.z - start.z) * segment.z) / segmentLengthSq, 0, 1)
      const point = new THREE.Vector3(start.x + segment.x * t, start.y + (end.y - start.y) * t, start.z + segment.z * t)
      const deltaX = point.x - position.x
      const deltaZ = point.z - position.z
      const distance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ)

      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = {
          direction: t > 0.88 && index < route.length - 2 ? 1 : t < 0.12 && index > 0 ? -1 : 1,
          distance,
          point,
          route,
          segmentIndex: index,
        }
      }
    }
  })

  return bestMatch
}

function getCarLookAxis(object: THREE.Object3D) {
  const box = new THREE.Box3().makeEmpty()
  const inverseObjectMatrix = new THREE.Matrix4()
  const meshMatrix = new THREE.Matrix4()
  const point = new THREE.Vector3()

  object.updateWorldMatrix(true, true)
  inverseObjectMatrix.copy(object.matrixWorld).invert()

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return
    }

    child.geometry.computeBoundingBox()

    if (!child.geometry.boundingBox) {
      return
    }

    meshMatrix.copy(inverseObjectMatrix).multiply(child.matrixWorld)
    box.union(new THREE.Box3().copy(child.geometry.boundingBox).applyMatrix4(meshMatrix))
  })

  if (box.isEmpty()) {
    return CITY_CAR_LOOK_AXIS.clone()
  }

  const size = box.getSize(new THREE.Vector3())
  const axis = size.x > size.z ? 'x' : 'z'
  const min = axis === 'x' ? box.min.x : box.min.z
  const max = axis === 'x' ? box.max.x : box.max.z
  const span = Math.max(0.0001, max - min)
  const lowLimit = min + span * 0.25
  const highLimit = max - span * 0.25
  let lowTotalY = 0
  let lowCount = 0
  let highTotalY = 0
  let highCount = 0

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return
    }

    const position = child.geometry.getAttribute('position')

    if (!position) {
      return
    }

    meshMatrix.copy(inverseObjectMatrix).multiply(child.matrixWorld)

    for (let index = 0; index < position.count; index += 1) {
      point.fromBufferAttribute(position, index).applyMatrix4(meshMatrix)

      const coordinate = axis === 'x' ? point.x : point.z

      if (coordinate <= lowLimit) {
        lowTotalY += point.y
        lowCount += 1
      } else if (coordinate >= highLimit) {
        highTotalY += point.y
        highCount += 1
      }
    }
  })

  const lowAverageY = lowCount > 0 ? lowTotalY / lowCount : 0
  const highAverageY = highCount > 0 ? highTotalY / highCount : 0
  const sign = lowAverageY <= highAverageY ? -1 : 1

  return axis === 'x' ? new THREE.Vector3(sign, 0, 0) : new THREE.Vector3(0, 0, sign)
}

function createPowerlineMaterial(name: string, mesh: THREE.Mesh): PowerlineMaterial {
  const normalizedName = normalizeName(name)
  const config = CITY_POWERLINE_MESH_CONFIG.get(normalizedName)
  const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3()).length()

  const material = new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: config?.depthWrite ?? true,
    fragmentShader: POWERLINE_FRAGMENT_SHADER,
    premultipliedAlpha: true,
    side: THREE.DoubleSide,
    transparent: true,
    uniforms: {
      uColor1: { value: POWERLINE_BAD.color1.clone() },
      uColor2: { value: POWERLINE_BAD.color2.clone() },
      uDirection: { value: config?.direction ?? 1 },
      uOpacity: { value: 0.75 },
      uSpeed: { value: POWERLINE_BAD.speed },
      uTime: { value: 0 },
      uTransition: { value: CITY_HIDDEN_POWERLINES.has(normalizedName) ? 0 : 1 },
      uUvOffset: { value: new THREE.Vector2(0, 0) },
      uUvScale: { value: POWERLINE_BAD.uvScale * Math.max(0.5, size / 4) },
    },
    vertexShader: POWERLINE_VERTEX_SHADER,
  }) as PowerlineMaterial

  if (config?.yOffset) {
    mesh.position.y += config.yOffset
  }

  return material
}

function createCarMover(object: THREE.Object3D, routes: THREE.Vector3[][], index: number): CarMover | null {
  const routeMatch = getClosestRouteMatch(object.position, routes)

  if (!routeMatch) {
    return null
  }

  const speed = 0.28 + (index % 4) * 0.03
  const rotationSpeed = 0.18
  const lookAxis = getCarLookAxis(object)
  const lookOffset = new THREE.Quaternion().setFromUnitVectors(lookAxis, CITY_CAR_LOOK_AXIS)
  const helper = new THREE.Object3D()
  const route = routeMatch.route
  let waypointIndex = routeMatch.segmentIndex + (routeMatch.direction > 0 ? 1 : 0)
  let travelDirection: 1 | -1 = routeMatch.direction
  let delay = index * 0.75

  if (routeMatch.distance <= CITY_CAR_ROUTE_SNAP_MAX_DISTANCE) {
    object.position.copy(routeMatch.point)
  }

  const initialTarget = route[waypointIndex]

  if (initialTarget) {
    helper.position.copy(object.position)
    helper.lookAt(initialTarget.x, object.position.y, initialTarget.z)
    helper.quaternion.multiply(lookOffset)
    object.quaternion.copy(helper.quaternion)
  }

  return {
    update(delta: number) {
      delay -= delta

      if (delay > 0) {
        return
      }

      const target = route[waypointIndex]

      if (!target) {
        return
      }

      const deltaX = target.x - object.position.x
      const deltaZ = target.z - object.position.z
      const horizontalDistance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ)

      if (horizontalDistance < 0.02) {
        object.position.copy(target)

        if (waypointIndex <= 0) {
          travelDirection = 1
        } else if (waypointIndex >= route.length - 1) {
          travelDirection = -1
        }

        waypointIndex += travelDirection
        return
      }

      const step = Math.min(horizontalDistance, speed * delta)
      const t = horizontalDistance > 0 ? step / horizontalDistance : 1

      object.position.set(
        object.position.x + deltaX * t,
        object.position.y + (target.y - object.position.y) * t,
        object.position.z + deltaZ * t,
      )
      helper.position.copy(object.position)
      helper.lookAt(target.x, object.position.y, target.z)
      helper.quaternion.multiply(lookOffset)
      object.quaternion.slerp(helper.quaternion, rotationSpeed)
    },
  }
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
  const navigationFrameRef = useRef<number | null>(null)
  const navigationStepRef = useRef<number | null>(null)
  const mountRef = useRef<HTMLDivElement | null>(null)
  const progressRef = useRef(0)
  const storageProgressRef = useRef(0)
  const cameraProgressRef = useRef(0)
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
    let lastFrameTime = performance.now()
    let cityRoot: THREE.Group | null = null
    let cameraRail: CameraRail | null = null
    let sceneKtx2Loader: KTX2Loader | null = null
    let sceneDracoLoader: DRACOLoader | null = null
    let sceneGltfLoader: GLTFLoader | null = null
    let activeObserver: IntersectionObserver | null = null

    const turbineRotors: TurbineRotor[] = []
    const carMovers: CarMover[] = []
    const batteryRuntimes: BatteryRuntime[] = []
    const lineRuntimes: PowerlineRuntime[] = []
    let storageCloseupRuntime: StorageCloseupRuntime | null = null
    const fallbackTarget = new THREE.Vector3()
    const targetWithDrag = new THREE.Vector3()
    const rightVector = new THREE.Vector3()
    const upVector = new THREE.Vector3()
    const closeupCameraPosition = new THREE.Vector3()
    const closeupCameraQuaternion = new THREE.Quaternion()

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

    renderer.setClearColor(0xffffff, 1)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = false
    hostElement.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)
    scene.fog = null

    const cameraFrustum = 50
    const camera = new THREE.OrthographicCamera(-cameraFrustum / 2, cameraFrustum / 2, cameraFrustum / 2, -cameraFrustum / 2, 0.1, 1000)
    const ambient = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.2)
    const keyLight = new THREE.DirectionalLight(0xffffff, 0)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0)
    keyLight.position.set(5, 12, -10)
    fillLight.position.set(-28, 18, -18)
    scene.add(ambient, keyLight, fillLight)

    const resizeObserver = new ResizeObserver(resize)

    function resize() {
      if (destroyed) {
        return
      }

      const width = Math.max(1, hostElement.clientWidth)
      const height = Math.max(1, hostElement.clientHeight)
      const aspect = width / height
      renderer.setSize(width, height, false)
      camera.left = (-cameraFrustum * aspect) / 2
      camera.right = (cameraFrustum * aspect) / 2
      camera.top = cameraFrustum / 2
      camera.bottom = -cameraFrustum / 2
      camera.updateProjectionMatrix()
    }

    function setStepFromProgress(progress: number) {
      if (navigationStepRef.current !== null) {
        return
      }

      const index = getVisibleRangeIndex(progress, sceneSteps.length)

      if (index !== activeStepRef.current) {
        activeStepRef.current = index
        setActiveStep(index)
      }
    }

    function applyStorageOverlayProgress(progress: number) {
      const section = sectionRef.current

      if (!section) {
        return
      }

      const overlay = getStorageChargeOverlayState(progress, sceneSteps.length)
      section.style.setProperty('--storage-charge-progress', overlay.charge.toFixed(3))
      section.style.setProperty('--storage-closeup-progress', overlay.closeup.toFixed(3))
      section.dataset.storageCloseup = overlay.closeup > 0.05 ? 'true' : 'false'
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
      section.style.setProperty('--grid-progress', String(progress))
      applyStorageOverlayProgress(storageProgressRef.current)
      setStepFromProgress(progress)

      const isActive = rect.top < window.innerHeight * 0.92 && rect.bottom > window.innerHeight * 0.08
      document.body.classList.toggle('grid-volatility-active', isActive)
    }

    function scheduleScrollUpdate() {
      window.requestAnimationFrame(updateScrollProgress)
    }

    function clearNavigationStep() {
      navigationStepRef.current = null
    }

    function onManualScrollKey(event: KeyboardEvent) {
      if (['ArrowDown', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp', ' '].includes(event.key)) {
        clearNavigationStep()
      }
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
      dragRef.current.rotateY = clamp(dragRef.current.rotateY + deltaX * 0.003, -0.75, 0.75)
      dragRef.current.rotateX = clamp(dragRef.current.rotateX + deltaY * 0.002, -0.32, 0.34)
    }

    function onPointerUp(event: PointerEvent) {
      dragRef.current.isDragging = false
      setIsDragging(false)
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId)
      }
    }

    async function loadCityFloorTextures(loader: KTX2Loader) {
      const device = window.innerWidth < 834 ? 'mobile' : 'desktop'
      const floorTextures = new Map<string, THREE.Texture>()
      const entries = await Promise.all(
        Object.entries(CITY_TEXTURE_PATHS).map(async ([key, source]) => {
          try {
            const texture = await loader.loadAsync(source[device])
            return { key: normalizeName(key), texture }
          } catch (error) {
            console.warn(`Grid volatility texture could not load: ${source[device]}`, error)
            return null
          }
        }),
      )

      entries.forEach((entry) => {
        if (entry) {
          floorTextures.set(entry.key, entry.texture)
        }
      })

      return floorTextures
    }

    function updateSceneMaterial(root: THREE.Object3D, floorTextures: Map<string, THREE.Texture>) {
      root.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) {
          return
        }

        const normalizedName = normalizeName(child.name)
        child.frustumCulled = false

        if (normalizedName.includes('WAYPOINT') || normalizedName.includes('BESSICON')) {
          child.visible = false
          return
        }

        if (CITY_CLOSEUP_HIGH_CELLS.has(normalizedName)) {
          setMeshMaterialColor(child, '#ff9a7d', 1, true)
          child.renderOrder = 2
          return
        }

        if (CITY_CLOSEUP_LOW_CELLS.has(normalizedName)) {
          setMeshMaterialColor(child, '#ffffff', 1, true)
          child.renderOrder = 1
          return
        }

        if (CITY_CLOSEUP_LOW_OUTLINES.has(normalizedName)) {
          setMeshMaterialColor(child, '#000000', 1, true)
          return
        }

        if (CITY_CLOSEUP_LINE_KEYS.has(normalizedName)) {
          setMeshMaterialColor(child, '#eadf71', 1, true)
          child.renderOrder = 3
          return
        }

        if (CITY_POWERLINE_KEYS.has(normalizedName)) {
          const material = createPowerlineMaterial(child.name, child)
          child.material = material
          const initiallyHidden = CITY_HIDDEN_POWERLINES.has(normalizedName)
          child.visible = !initiallyHidden
          lineRuntimes.push({ initiallyHidden, material, mesh: child })
          return
        }

        const floorTexture = floorTextures.get(normalizedName)

        if (floorTexture) {
          setMeshTextureMaterial(child, floorTexture)
          child.renderOrder = normalizedName === normalizeName('floor') ? -2 : child.renderOrder
          return
        }

        const namedColor = extractColorFromName(child.name)

        if (namedColor) {
          const isCloseupSoftOutline =
            normalizedName === normalizeName('battery_big_outline_colorb8b8b8') ||
            normalizedName.includes('CUBESYELLOWOUTLINE') ||
            normalizedName.includes('CUBESGREENOUTLINE')
          const color = isCloseupSoftOutline ? '#b8b8b8' : namedColor
          setMeshMaterialColor(child, color, normalizedName.includes('OUTLINES') ? 1 : 0.96, CITY_FORCE_BASIC_COLOR_KEYS.has(normalizedName))
          return
        }

        if (normalizedName.includes('FLOOR') && !normalizedName.includes('FLOORLINES')) {
          setMeshMaterialColor(child, '#ffffff', 1, true)
        } else if (normalizedName.includes('FLOORLINES')) {
          setMeshMaterialColor(child, '#d4d4d4', 1, true)
        } else if (
          normalizedName.includes('GEOMETRY') ||
          normalizedName.includes('BATTER') ||
          normalizedName.includes('BATTIES') ||
          normalizedName.includes('CARSGEO') ||
          normalizedName.includes('WINDGEO')
        ) {
          setCityBakedToneMaterial(child)
        } else {
          preserveOriginalCityMaterial(child)
        }
      })
    }

    function setObjectVisible(object: THREE.Object3D, visible: boolean) {
      object.visible = visible
      object.traverse((child) => {
        child.visible = visible
      })
    }

    function collectStorageCells(root: THREE.Object3D) {
      const cells: StorageCellRuntime[] = []

      root.traverse((child) => {
        if (!(child instanceof THREE.Mesh) || !CITY_CLOSEUP_HIGH_CELLS.has(normalizeName(child.name))) {
          return
        }

        const material = createStorageCellMaterial(child)

        child.material = material
        child.renderOrder = 6
        cells.push({
          material,
          mesh: child,
          originalPosition: child.position.clone(),
          originalQuaternion: child.quaternion.clone(),
          originalScale: child.scale.clone(),
        })
      })

      return cells
    }

    function collectStorageCloseupRuntime(root: THREE.Object3D): StorageCloseupRuntime | null {
      const closeupRoot = getFirstNamedObject(root, CITY_CLOSEUP_ROOT_KEY)

      if (!closeupRoot) {
        return null
      }

      const cameraObject = getFirstNamedObject(root, CITY_CLOSEUP_CAMERA_KEY)
      const cameraNode = cameraObject instanceof THREE.Camera ? cameraObject : null
      const arrowIcons = CITY_CLOSEUP_ARROW_KEYS.map((key) => getFirstNamedObject(root, key)).filter(
        (object): object is THREE.Object3D => Boolean(object),
      ).map(createStorageObjectRuntime)
      const powerIcons = CITY_CLOSEUP_POWER_KEYS.map((key) => getFirstNamedObject(root, key)).filter(
        (object): object is THREE.Object3D => Boolean(object),
      ).map(createStorageObjectRuntime)
      const lineObjects = getNamedObjects(root, ['line.001']).map(createStorageObjectRuntime)
      const yellowCells = collectStorageCells(closeupRoot)

      setObjectVisible(closeupRoot, false)

      return {
        arrowIcons,
        camera: cameraNode,
        lineObjects,
        powerIcons,
        root: closeupRoot,
        rootPosition: closeupRoot.position.clone(),
        rootQuaternion: closeupRoot.quaternion.clone(),
        rootScale: closeupRoot.scale.clone(),
        yellowCells,
      }
    }

    function collectSceneRuntime(root: THREE.Object3D) {
      CITY_TURBINE_KEYS.forEach((key, index) => {
        const rotor = getFirstNamedObject(root, key)

        if (rotor) {
          rotor.rotation.z = Math.random() * Math.PI * 2
          turbineRotors.push({
            object: rotor,
            speed: 3.4 + (index % 3) * 0.35,
          })
        }
      })

      const routePositions = CITY_CAR_ROUTES.map((route) =>
        route
          .map((waypoint) => getFirstNamedObject(root, waypoint))
          .filter((waypoint): waypoint is THREE.Object3D => Boolean(waypoint))
          .map((waypoint) => waypoint.position.clone()),
      ).concat(CITY_CAR_STATIC_ROUTES)

      getNamedObjects(root, CITY_CAR_KEYS).forEach((car, index) => {
        const mover = createCarMover(car, routePositions, index)

        if (mover) {
          carMovers.push(mover)
        }
      })

      CITY_BATTERY_SETS.flat().forEach((key) => {
        const battery = getFirstNamedObject(root, key)

        if (!battery) {
          return
        }

        const normalizedName = normalizeName(key)
        const initiallyHidden = CITY_WIND_SOLAR_BATTERIES.has(normalizedName)
        const originalY = battery.position.y
        battery.userData.originalY = originalY
        battery.position.y = initiallyHidden ? -1 : originalY
        battery.visible = !initiallyHidden
        batteryRuntimes.push({
          initiallyHidden,
          isolated: CITY_ISOLATED_BATTERIES.has(normalizedName),
          object: battery,
          originalY,
        })
      })

      storageCloseupRuntime = collectStorageCloseupRuntime(root)
    }

    function positionCamera(progress: number) {
      const storageOverlay = getStorageChargeOverlayState(storageProgressRef.current, sceneSteps.length)
      const closeupRuntime = storageCloseupRuntime

      if (closeupRuntime?.camera && storageOverlay.closeup > 0.01) {
        closeupRuntime.camera.getWorldPosition(closeupCameraPosition)
        closeupRuntime.camera.getWorldQuaternion(closeupCameraQuaternion)
        camera.position.copy(closeupCameraPosition)
        camera.quaternion.copy(closeupCameraQuaternion)
        camera.zoom = STORAGE_CLOSEUP_ZOOM
        camera.updateProjectionMatrix()
        return
      }

      if (!cameraRail) {
        camera.position.set(44, 30, 46)
        fallbackTarget.set(0, 0, 0)
        camera.lookAt(fallbackTarget)
        camera.zoom = 7
        camera.updateProjectionMatrix()
        return
      }

      const sample = sampleCameraRail(progress, cameraRail)
      const position = cameraRail.positionCurve.getPoint(sample.curveProgress)
      const target = cameraRail.targetCurve.getPoint(sample.curveProgress)
      const dragScale = clamp(1 - progress * 0.48, 0.18, 1)

      camera.position.copy(position)
      camera.lookAt(target)

      rightVector.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize()
      upVector.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize()
      camera.position.addScaledVector(rightVector, dragRef.current.rotateY * 3.2 * dragScale)
      camera.position.addScaledVector(upVector, dragRef.current.rotateX * 6.4 * dragScale)

      targetWithDrag.copy(target)
      targetWithDrag.addScaledVector(rightVector, dragRef.current.rotateY * 0.9 * dragScale)
      targetWithDrag.addScaledVector(upVector, dragRef.current.rotateX * 1.3 * dragScale)
      camera.lookAt(targetWithDrag)
      camera.zoom = sample.zoom
      camera.updateProjectionMatrix()
    }

    function updateStorageCloseup() {
      const closeupRuntime = storageCloseupRuntime

      if (!closeupRuntime) {
        return
      }

      const overlay = getStorageChargeOverlayState(storageProgressRef.current, sceneSteps.length)
      const visible = overlay.closeup > 0.02
      setObjectVisible(closeupRuntime.root, visible)

      if (!visible) {
        return
      }

      const charge = overlay.charge
      const pulse = 0.5 + Math.sin(performance.now() * 0.0022) * 0.5
      closeupRuntime.root.position.copy(closeupRuntime.rootPosition)
      closeupRuntime.root.quaternion.copy(closeupRuntime.rootQuaternion)
      closeupRuntime.root.scale.copy(closeupRuntime.rootScale)

      closeupRuntime.yellowCells.forEach(({ material, mesh, originalPosition, originalQuaternion, originalScale }) => {
        mesh.position.copy(originalPosition)
        mesh.quaternion.copy(originalQuaternion)
        mesh.scale.copy(originalScale)
        material.uniforms.uFill.value = charge
        material.uniforms.uPulse.value = charge > 0.02 && charge < 0.98 ? pulse : 0
      })

      closeupRuntime.arrowIcons.forEach((runtime, index) => {
        restoreStorageObject(runtime)
        const reveal = smoothstep(index * 0.12, index * 0.12 + 0.2, charge)
        runtime.object.visible = reveal > 0.04
        runtime.object.scale.copy(runtime.originalScale).multiplyScalar(1 + reveal * pulse * 0.08)
      })

      closeupRuntime.powerIcons.forEach((runtime) => {
        restoreStorageObject(runtime)
        runtime.object.visible = charge > 0.02
        runtime.object.scale.copy(runtime.originalScale).multiplyScalar(1 + charge * pulse * 0.045)
      })

      closeupRuntime.lineObjects.forEach((runtime, index) => {
        restoreStorageObject(runtime)
        runtime.object.visible = smoothstep(index * 0.08, index * 0.08 + 0.16, charge) > 0.02
      })
    }

    function updateBatteries(progress: number) {
      const mainReveal = clamp((progress - 0.18) * 7, 0, 1)
      const windReveal = clamp((progress - 0.74) * 10, 0, 1)
      const isolateAmount = clamp((progress - 0.28) * 8, 0, 1) * clamp((0.66 - progress) * 8, 0, 1)

      batteryRuntimes.forEach((battery, index) => {
        const reveal = battery.initiallyHidden ? windReveal : mainReveal
        battery.object.visible = !battery.initiallyHidden || reveal > 0.02

        if (battery.initiallyHidden) {
          battery.object.position.y = -1 + (battery.originalY + 1) * clamp(reveal - index * 0.004, 0, 1)
        } else {
          battery.object.position.y = battery.originalY
        }

        if (battery.isolated) {
          battery.object.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) {
              return
            }

            const materials = Array.isArray(child.material) ? child.material : [child.material]
            materials.forEach((material) => {
              if ('emissive' in material && material.emissive instanceof THREE.Color) {
                material.emissive.set('#fff313')
                material.emissiveIntensity = isolateAmount * 0.35
              }
            })
          })
        }
      })
    }

    function updatePowerlines(delta: number, progress: number) {
      const earlyGood = clamp((progress - 0.18) * 8, 0, 1)
      const closeupBad = clamp((progress - 0.58) * 8, 0, 1) * (1 - clamp((progress - 0.89) * 12, 0, 1))
      const finalGood = clamp((progress - 0.9) * 10, 0, 1)
      const goodAmount = clamp(Math.max(earlyGood * (1 - closeupBad), finalGood), 0, 1)

      lineRuntimes.forEach((line) => {
        const hiddenReveal = line.initiallyHidden ? clamp((progress - 0.6) * 10, 0, 1) : 1
        line.mesh.visible = !line.initiallyHidden || hiddenReveal > 0.02
        line.material.uniforms.uTime.value += delta
        line.material.uniforms.uTransition.value = hiddenReveal
        line.material.uniforms.uSpeed.value = POWERLINE_BAD.speed + goodAmount * 0.2
        line.material.uniforms.uColor1.value.copy(POWERLINE_BAD.color1).lerp(POWERLINE_GOOD.color1, goodAmount)
        line.material.uniforms.uColor2.value.copy(POWERLINE_BAD.color2).lerp(POWERLINE_GOOD.color2, goodAmount)
      })
    }

    function animate() {
      if (destroyed) {
        return
      }

      const now = performance.now()
      const delta = Math.min(0.05, (now - lastFrameTime) / 1000)
      lastFrameTime = now
      const progress = progressRef.current
      const scrollCameraProgress = getCameraProgressFromScroll(progress, sceneSteps.length)
      const cameraProgress = exponentialDamp(cameraProgressRef.current, scrollCameraProgress, CAMERA_EASING_STIFFNESS, delta)
      const storageProgress = exponentialDamp(storageProgressRef.current, progress, STORAGE_PROGRESS_STIFFNESS, delta)
      cameraProgressRef.current = cameraProgress
      storageProgressRef.current = storageProgress
      applyStorageOverlayProgress(storageProgress)

      positionCamera(cameraProgress)
      updateStorageCloseup()

      turbineRotors.forEach((rotor) => {
        rotor.object.rotation.z -= delta * rotor.speed
      })

      carMovers.forEach((car) => {
        car.update(delta)
      })

      updateBatteries(cameraProgress)
      updatePowerlines(delta, cameraProgress)
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

        const [gltf, floorTextures] = await Promise.all([
          sceneGltfLoader.loadAsync(CITY_GLB_PATH),
          loadCityFloorTextures(sceneKtx2Loader),
        ])

        if (destroyed) {
          disposeObject(gltf.scene)
          return
        }

        const nextCityRoot = gltf.scene
        nextCityRoot.updateMatrixWorld(true)
        const center = new THREE.Box3().setFromObject(nextCityRoot).getCenter(new THREE.Vector3())
        cameraRail = buildCameraRail(nextCityRoot, center)
        updateSceneMaterial(nextCityRoot, floorTextures)
        collectSceneRuntime(nextCityRoot)
        nextCityRoot.position.sub(center)
        nextCityRoot.scale.setScalar(1)
        cityRoot = nextCityRoot
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
    if (sectionRef.current) {
      activeObserver = new IntersectionObserver(
        ([entry]) => {
          document.body.classList.toggle('grid-volatility-active', Boolean(entry?.isIntersecting))
        },
        { rootMargin: '-12% 0px -12% 0px', threshold: 0 },
      )
      activeObserver.observe(sectionRef.current)
    }
    resize()
    updateScrollProgress()
    window.requestAnimationFrame(updateScrollProgress)
    window.setTimeout(updateScrollProgress, 350)
    void loadCity()
    animate()

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('scroll', scheduleScrollUpdate, { passive: true })
    window.addEventListener('resize', scheduleScrollUpdate)
    window.addEventListener('wheel', clearNavigationStep, { passive: true })
    window.addEventListener('touchstart', clearNavigationStep, { passive: true })
    window.addEventListener('keydown', onManualScrollKey)

    return () => {
      destroyed = true
      window.cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      activeObserver?.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('scroll', scheduleScrollUpdate)
      window.removeEventListener('resize', scheduleScrollUpdate)
      window.removeEventListener('wheel', clearNavigationStep)
      window.removeEventListener('touchstart', clearNavigationStep)
      window.removeEventListener('keydown', onManualScrollKey)
      document.body.classList.remove('grid-volatility-active')
      if (navigationFrameRef.current !== null) {
        window.cancelAnimationFrame(navigationFrameRef.current)
        navigationFrameRef.current = null
      }
      navigationStepRef.current = null

      if (cityRoot) {
        disposeObject(cityRoot)
        scene.remove(cityRoot)
      }

      sceneKtx2Loader?.dispose()
      sceneDracoLoader?.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [sceneSteps.length])

  const active = sceneSteps[activeStep] ?? sceneSteps[0]
  const displayActive = active
  const pin = pinPositions[activeStep] ?? pinPositions[0]
  const sceneStyle = {
    '--pin-x': `${pin?.x ?? 58}%`,
    '--pin-y': `${pin?.y ?? 45}%`,
    '--storage-charge-progress': 0,
    '--storage-closeup-progress': 0,
  } as CSSProperties

  function goToStep(index: number) {
    const section = sectionRef.current

    if (!section) {
      return
    }

    const nextIndex = clamp(index, 0, sceneSteps.length - 1)
    const start = window.scrollY + section.getBoundingClientRect().top
    const distance = Math.max(1, section.offsetHeight - window.innerHeight)
    const progress = getNavigationStepProgress(nextIndex, sceneSteps.length)
    const targetTop = start + distance * progress - 1
    const currentProgress = progressRef.current
    const duration = getNavigationDurationMs(currentProgress, progress)

    if (navigationFrameRef.current !== null) {
      window.cancelAnimationFrame(navigationFrameRef.current)
      navigationFrameRef.current = null
    }

    navigationStepRef.current = nextIndex
    activeStepRef.current = nextIndex
    setActiveStep(nextIndex)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo({ behavior: 'auto', top: targetTop })
      return
    }

    const initialTop = window.scrollY
    const distanceToTarget = targetTop - initialTop
    const startedAt = performance.now()

    const step = (now: number) => {
      const elapsed = now - startedAt
      const amount = easeInOutQuad(elapsed / duration)
      window.scrollTo({ behavior: 'auto', top: initialTop + distanceToTarget * amount })

      if (amount < 1) {
        navigationFrameRef.current = window.requestAnimationFrame(step)
      } else {
        navigationFrameRef.current = null
      }
    }

    navigationFrameRef.current = window.requestAnimationFrame(step)
  }

  function goToRelativeStep(direction: -1 | 1) {
    const currentIndex = navigationStepRef.current ?? activeStep
    goToStep(currentIndex + direction)
  }

  if (!active) {
    return null
  }

  return (
    <section
      className="webgl-experience grid-volatility-scene"
      id="solutions"
      ref={sectionRef}
      style={sceneStyle}
    >
      <div className="webgl-sticky">
        <div
          className="webgl-stage"
          data-dragging={isDragging ? 'true' : 'false'}
          data-ready={isReady ? 'true' : 'false'}
          ref={setMountRef}
        />
        <div className="grid-scene-wash" aria-hidden="true" />

        <div className={`webgl-map-pin ${displayActive.kind}`}>
          <span className="power-status-icon" aria-hidden="true">
            <i />
            <b />
          </span>
          <span>{displayActive.number}</span>
        </div>

        <div className={`grid-info-card ${displayActive.kind}`} aria-live="polite">
          <div className="grid-info-kicker">
            <span aria-hidden="true" />
            {displayActive.label} {displayActive.number}
          </div>
          <h2>{displayActive.title}</h2>
          <p>{displayActive.body}</p>
          {!isReady && !loadError && <small>{labels.loading}</small>}
          {loadError && <small>{labels.fallback}</small>}
        </div>

        <div className={`grid-capacity-card ${displayActive.kind}`}>
          <div className="capacity-head">
            <small>{labels.capacity}</small>
            <strong>
              {displayActive.capacity}
              <span>GW</span>
            </strong>
          </div>
          <div
            className="capacity-track"
            style={
              {
                '--capacity-progress': `${displayActive.progress}%`,
                '--capacity-scale': displayActive.progress / 100,
              } as CSSProperties
            }
          >
            <span>
              <i aria-hidden="true" />
              {displayActive.progress}%
            </span>
          </div>
        </div>

        <div className="grid-bess-badge" aria-hidden="true">
          <span />
          BESS
        </div>

        <div className="grid-scene-copy" aria-hidden="true">
          <span>{eyebrow}</span>
          <h3>{title}</h3>
          <p>{body}</p>
        </div>

        <div className="grid-interaction-hint">
          <span />
          {labels.drag}
        </div>

        <div className="webgl-step-rail" aria-hidden="true">
          {sceneSteps.map((step, index) => (
            <span className={activeStep === index ? 'is-active' : ''} key={`${step.kind}-${step.number}`} />
          ))}
        </div>

        <div className="webgl-actions" aria-label={labels.steps}>
          <button
            aria-label="Previous scene"
            className="dots-button arrow-up"
            disabled={activeStep === 0}
            onClick={() => goToRelativeStep(-1)}
            type="button"
          >
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </button>
          <button
            aria-label="Next scene"
            className="dots-button arrow-down"
            disabled={activeStep === sceneSteps.length - 1}
            onClick={() => goToRelativeStep(1)}
            type="button"
          >
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </section>
  )
}
