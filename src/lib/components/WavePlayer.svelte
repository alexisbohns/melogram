<script lang="ts">
  import { onDestroy, onMount } from 'svelte'

  export let src: string | null | undefined
  export let height: number = 64
  export let waveColor: string = '#9ca3af' // gray-400
  export let progressColor: string = '#111827' // gray-900
  export let cursorColor: string = '#6b7280' // gray-500
  export let barWidth: number | null = 2
  export let barGap: number | null = 1
  export let barRadius: number | null = 2
  export let autoplay: boolean = false

  let containerEl: HTMLDivElement | null = null
  let ws: any | null = null
  let isReady = false
  let isPlaying = false

  async function init() {
    if (typeof window === 'undefined' || !containerEl || !src) return
    if (ws) return

    const mod = await import('wavesurfer.js')
    const WaveSurfer = mod.default
    ws = WaveSurfer.create({
      container: containerEl,
      height,
      waveColor,
      progressColor,
      cursorColor,
      barWidth: barWidth ?? undefined,
      barGap: barGap ?? undefined,
      barRadius: barRadius ?? undefined,
      url: src,
      renderFunction: (channels, ctx) => {
        const { width, height } = ctx.canvas
        const scale = channels[0].length / width
        const step = 10

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
      }
    })

    ws.on('ready', () => {
      isReady = true
      if (autoplay) ws?.play?.()
    })

    ws.on('play', () => (isPlaying = true))
    ws.on('pause', () => (isPlaying = false))
    ws.on('finish', () => (isPlaying = false))
  }

  function destroy() {
    try {
      ws?.destroy?.()
    } catch {}
    ws = null
    isReady = false
    isPlaying = false
  }

  onMount(() => {
    init()
    return () => destroy()
  })

  $: if (ws && src) {
    // reload when src changes
    ws.load?.(src)
  }

  function toggle() {
    if (!ws) return
    ws.isPlaying() ? ws.pause() : ws.play()
  }
</script>

{#if src}
  <div class="waveplayer">
    <button class="waveplayer_btn" on:click={toggle} disabled={!isReady} aria-label={isPlaying ? 'Pause' : 'Play'}>
      {#if isPlaying}
        ❚❚
      {:else}
        ►
      {/if}
    </button>
    <div class="waveplayer_wave" bind:this={containerEl}></div>
  </div>
{:else}
  <slot name="empty">Pas d’audio pour cette version.</slot>
{/if}

<style lang="stylus">
.waveplayer
  display flex
  align-items center
  gap .75rem
  width 100%

.waveplayer_btn
  appearance none
  border none
  background #f3f4f6
  color #111827
  width 2.25rem
  height 2.25rem
  border-radius 999px
  display inline-flex
  align-items center
  justify-content center
  font-weight bold
  cursor pointer
  &:disabled
    opacity .5
    cursor default

.waveplayer_wave
  flex 1
</style>
