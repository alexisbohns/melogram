import { readable, writable, get } from 'svelte/store'

export type PlayerSource = {
  src: string
  versionId?: string
}

type InternalState = {
  current: PlayerSource | null
  isReady: boolean
  isPlaying: boolean
  duration: number
  time: number
}

let ws: any | null = null
let containerEl: HTMLElement | null = null
let pending: { source: PlayerSource; autoplay: boolean } | null = null

const state = writable<InternalState>({
  current: null,
  isReady: false,
  isPlaying: false,
  duration: 0,
  time: 0
})

async function ensureWaveSurfer() {
  if (typeof window === 'undefined') return null
  if (!ws && containerEl) {
    const mod = await import('wavesurfer.js')
    const WaveSurfer = mod.default
    ws = WaveSurfer.create({
      container: containerEl,
      height: 50,
      waveColor: 'darkgrey',
      progressColor: 'white',
      cursorColor: '#a1a6a1',
      barWidth: 2,
      barGap: 2,
      barRadius: 0,
      renderFunction: (channels, ctx) => {
        const { width, height } = ctx.canvas
        const scale = channels[0].length / width
        const step = 7

        ctx.translate(0, height / 2)
        ctx.strokeStyle = ctx.fillStyle
        ctx.beginPath()

        for (let i = 0; i < width; i += step * 2) {
          const index = Math.floor(i * scale)
          const value = Math.abs(channels[0][index])
          let x = i
          let y = value * height

          ctx.moveTo(x, 0)
          ctx.lineTo(x, y)
          ctx.arc(x + step / 2, y, step / 2, Math.PI, 0, true)
          ctx.lineTo(x + step, 0)

          x = x + step
          y = -y
          ctx.moveTo(x, 0)
          ctx.lineTo(x, y)
          ctx.arc(x + step / 2, y, step / 2, Math.PI, 0, false)
          ctx.lineTo(x + step, 0)
        }

        ctx.stroke()
        ctx.closePath()
      },
    })
    ws.on('ready', () => state.update((s) => ({ ...s, isReady: true, duration: ws.getDuration?.() || 0 })))
    ws.on('decode', () => state.update((s) => ({ ...s, isReady: true, duration: ws.getDuration?.() || 0 })))
    ws.on('error', () => state.update((s) => ({ ...s, isReady: false })))
    ws.on('play', () => state.update((s) => ({ ...s, isPlaying: true })))
    ws.on('pause', () => state.update((s) => ({ ...s, isPlaying: false })))
    ws.on('finish', () => state.update((s) => ({ ...s, isPlaying: false, time: 0 })))
    ws.on('timeupdate', (t: number) => state.update((s) => ({ ...s, time: t })))
  }
  return ws
}

export function attach(el: HTMLElement) {
  containerEl = el
  // if there is already a current source, rebuild the wavesurfer in new container
  if (typeof window !== 'undefined') {
    // destroy previous WS since the container changed
    try { ws?.destroy?.() } catch {}
    ws = null
    ensureWaveSurfer().then(() => {
      if (pending) {
        const { source, autoplay } = pending
        pending = null
        performLoad(source, autoplay)
        return
      }
      const cur = get(state).current
      if (cur?.src) {
        // resume current; if previously playing, autoplay
        const wasPlaying = get(state).isPlaying
        performLoad(cur, wasPlaying)
      }
    })
  }
}

export function detach() {
  containerEl = null
  try { ws?.destroy?.() } catch {}
  ws = null
  state.update((s) => ({ ...s, isReady: false, isPlaying: false }))
}

export async function load(source: PlayerSource, autoplay = false) {
  state.update((s) => ({ ...s, current: source, isReady: false }))
  pending = { source, autoplay }
  const w = await ensureWaveSurfer()
  if (!w) return
  performLoad(source, autoplay)
}

export function toggle() {
  if (!ws) return
  const playing = typeof ws.isPlaying === 'function' ? ws.isPlaying() : !!ws.isPlaying
  if (playing) ws.pause()
  else ws.play()
}

export function pause() { if (ws) ws.pause?.() }
export function play() { if (ws) ws.play?.() }

export const current = readable<PlayerSource | null>(null, (set) => {
  const unsub = state.subscribe((s) => set(s.current))
  return () => unsub()
})

export const isPlaying = readable<boolean>(false, (set) => {
  const unsub = state.subscribe((s) => set(s.isPlaying))
  return () => unsub()
})

export const isReady = readable<boolean>(false, (set) => {
  const unsub = state.subscribe((s) => set(s.isReady))
  return () => unsub()
})

export const time = readable<number>(0, (set) => {
  const unsub = state.subscribe((s) => set(s.time))
  return () => unsub()
})

export const duration = readable<number>(0, (set) => {
  const unsub = state.subscribe((s) => set(s.duration))
  return () => unsub()
})

function performLoad(source: PlayerSource, autoplay: boolean) {
  if (!ws) return
  // Register playback before loading to avoid race with fast-ready
  if (autoplay) {
    const onReady = () => { ws?.play?.(); ws?.un?.('ready', onReady) }
    ws.on('ready', onReady)
  }
  ws.load?.(source.src)
}
