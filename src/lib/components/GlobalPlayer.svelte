<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import Icon from '$lib/components/Icon.svelte'
  import { icons } from '$lib/icons'
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
  $: progress = $duration > 0 ? ($time / $duration) * 100 : 0
</script>

{#if hasTrack}
  <div class="global-player" role="complementary" aria-label="{$t('audio.player')}">
    <div class="global-player-wave" bind:this={containerEl}></div>
    <div class="global-player-controls">
      <button class="control" on:click={toggle} disabled={!$isReady} aria-label={$isPlaying ? $t('common.pause') : $t('common.play')} aria-pressed={$isPlaying}>
        {#if $isPlaying}
          <Icon icon={icons.pause} size={16} label={$t('common.pause')} />
        {:else}
          <Icon icon={icons.play} size={16} label={$t('common.play')} />
        {/if}
      </button>
      <div class="timeline">
        <div class="timeline-progress" style={`width:${progress}%`}></div>
      </div>
    </div>
  </div>
{/if}

<style lang="stylus">
.global-player
  position fixed
  left 0
  right 0
  bottom 0
  padding .5rem 1rem
  background rgba(0,0,0,0.6)
  backdrop-filter blur(6px)
  border-top 1px solid rgba(255,255,255,0.1)
  display flex
  flex-direction column
  gap .5rem
  z-index 100

.global-player-controls
  display flex
  align-items center
  gap .75rem

.global-player-wave
  height 56px

.control
  appearance none
  border none
  background rgba(255,255,255,0.8)
  color black
  border-radius .25rem
  padding .5rem
  cursor pointer

  &:disabled
    opacity .5
    cursor default

.timeline
  position relative
  flex 1
  height 4px
  background rgba(255,255,255,0.2)
  border-radius 2px

.timeline-progress
  position absolute
  left 0
  top 0
  bottom 0
  background white
  border-radius 2px
</style>
