<script lang="ts">
  import { onDestroy, onMount } from 'svelte'

  export let src: string | null | undefined
  export let height: number = 64
  export let waveColor: string = '#8f8572' // gray-400
  export let progressColor: string = 'white' // gray-900
  export let cursorColor: string = '#a1a6a1' // gray-500
  export let barWidth: number | null = 2
  export let barGap: number | null = 2
  export let barRadius: number | null = 4
  export let autoplay: boolean = false

  let containerEl: HTMLDivElement | null = null
  let ws: any | null = null
  let isReady = false
  let isPlaying = false

  import Icon from '$lib/components/Icon.svelte'
  import { icons } from '$lib/icons'
  import { t } from '$lib/i18n/i18n'

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
      },
    })

    const markReady = () => { isReady = true }
    ws.on('ready', markReady)
    ws.on('decode', markReady)
    ws.on('error', () => { isReady = false })

    ws.on('play', () => (isPlaying = true))
    ws.on('pause', () => (isPlaying = false))
    ws.on('finish', () => (isPlaying = false))

    ws.on('ready', () => {
      isReady = true
      if (autoplay) ws?.play?.()
    });
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
    isReady = false
    ws.load?.(src)
  }

  function toggle() {
    if (!ws) return
    const playing = typeof ws.isPlaying === 'function' ? ws.isPlaying() : !!ws.isPlaying
    if (playing) ws.pause()
    else ws.play()
    // reflect UI immediately in case events are delayed
    isPlaying = !playing
  }
</script>

{#if src}
  <div class="waveplayer">
    <div class="waveplayer_wave" bind:this={containerEl}></div>
    <button class="waveplayer_control" on:click={toggle} disabled={!isReady} aria-label={isPlaying ? $t('common.pause') : $t('common.play')} aria-pressed={isPlaying}>
      {#if isPlaying}
        <Icon icon={icons.pause} size={18} label={$t('common.pause')} />
        <span>{$t('common.pause')}</span>
      {:else}
        <Icon icon={icons.play} size={18} label={$t('common.play')} />
        <span>{$t('common.play')}</span>
      {/if}
    </button>
  </div>
{:else}
  <slot name="empty">{$t('audio.no_audio')}</slot>
{/if}

<style lang="stylus">
.waveplayer
  display flex
  flex-direction column
  align-items center
  gap .75rem
  width 100%

.waveplayer_control
  font-family var(--font-captions)
  appearance none
  border none
  background rgba(255,255,255,0.7)
  color black
  border-radius 0.25rem
  padding 0.5rem 1rem
  display flex
  gap 0.5rem
  align-items center
  justify-content center
  font-weight bold
  cursor pointer
  mix-blend-mode: plus-lighter
  border-bottom 2px solid rgba(255,255,255,0.8)
  width 100px

  &:disabled
    opacity .5
    cursor default

  &:active
    transform translate(0, 2px)
    opacity 0.8
    border-bottom none

.waveplayer_wave
  align-self stretch
  flex 1
</style>
