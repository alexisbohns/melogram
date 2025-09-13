<script lang="ts">
  import { onMount } from 'svelte'

  export let src: string | null | undefined
  export let preload: 'none' | 'metadata' | 'auto' = 'metadata'
  export let controls: string[] = [
    'play',
    'progress',
    'current-time',
    'mute',
    'volume'
  ]

  let audioEl: HTMLAudioElement
  let player: any | null = null
  let timer: any | null = null

  const init = () => {
    if (typeof window === 'undefined' || !audioEl) return
    const w = window as unknown as { Plyr?: any }
    if (!w.Plyr || player) return
    try {
      player = new w.Plyr(audioEl, { controls })
    } catch {
      // keep native audio as fallback
    }
  }

  onMount(() => {
    init()
    if (!player) {
      let tries = 0
      timer = setInterval(() => {
        tries += 1
        init()
        if (player || tries > 60) {
          if (timer) clearInterval(timer)
          timer = null
        }
      }, 100)
    }

    return () => {
      if (timer) clearInterval(timer)
      timer = null
      try {
        player?.destroy?.()
      } catch {}
      player = null
    }
  })
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.css"
  />
  <script
    src="https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.polyfilled.min.js"
    defer
  ></script>
  <style>
    .plyr--audio { max-width: 100%; }
  </style>
</svelte:head>

{#if src}
  <audio bind:this={audioEl} controls playsinline preload={preload} src={src}></audio>
{:else}
  <script lang="ts">
    import { t } from '$lib/i18n/i18n'
  </script>
  <slot name="empty">{$t('audio.no_audio')}</slot>
{/if}

<style lang="stylus">

</style>
