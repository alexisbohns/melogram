<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import PlayerControlButton from '$lib/components/PlayerControlButton.svelte'
  import { t } from '$lib/i18n/i18n'
  import { attach, detach, current, isPlaying, isReady, toggle, time, duration } from '$lib/player/player'

  let containerEl: HTMLDivElement | null = null

  onMount(() => {
    if (containerEl) attach(containerEl)
  })

  // attach when the element becomes available after first track loads
  $: if (containerEl) attach(containerEl)

  onDestroy(() => detach())

  $: hasTrack = $current !== null

  function fmtTime(totalSeconds: number) {
    const s = Math.max(0, Math.floor(totalSeconds || 0))
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }
  $: formattedCurrent = fmtTime($time)
  $: formattedRemaining = `-${fmtTime(Math.max(0, $duration - $time))}`
</script>

{#if hasTrack}
<div class="global-player-wrapper">
  <div class="global-player" role="complementary" aria-label="{$t('audio.player')}">
    <div class="global-player-title">
      {#if $current?.trackSlug}
        <a href={`/tracks/${$current.trackSlug}`} class="title-link">{$current?.title}</a>
      {:else}
        {$current?.title}
      {/if}
    </div>
    <div class="global-player-controls">
      <PlayerControlButton on:click={toggle} disabled={!$isReady} isPlaying={$isPlaying} />
      <span class="timecode current">{formattedCurrent}</span>
      <div class="global-player-wave" bind:this={containerEl}></div>
      <span class="timecode remaining">{formattedRemaining}</span>
    </div>
  </div>
</div>
{/if}

<style lang="stylus">
.global-player-wrapper
  position fixed
  left 0
  right 0
  bottom 0
  z-index 100
  padding 1rem
  max-width 700px
  margin auto

  @media screen and (min-width: 768px)
    padding-bottom 0
    

.global-player
  padding 1rem
  border-radius 1rem
  background rgba(0,0,0,0.4)
  backdrop-filter blur(10px)
  border 1px solid rgba(0,0,0,0.1)
  display flex
  flex-direction column
  gap 0.5rem

  @media screen and (min-width: 768px)
    border-radius 1rem 1rem 0 0

.global-player-title
  font-family var(--font-captions)
  font-size 1rem
  color var(--default)
  white-space nowrap
  overflow hidden
  text-overflow ellipsis

.global-player-title .title-link
  color inherit
  text-decoration none
  &:hover
    text-decoration underline

.global-player-controls
  display flex
  align-items center
  gap .75rem

.timecode
  font-variant-numeric tabular-nums
  font-family var(--font-captions)
  font-size .9rem
  opacity .8
  min-width 4ch
  text-align center

.global-player-wave
  width 100%

</style>
