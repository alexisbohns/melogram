<script lang="ts">
  import { onDestroy, onMount } from 'svelte'

  export let src: string | null | undefined
  export let version_id: string
  export let title: string | undefined
  export let track_slug: string | undefined
  export let coverUrl: string | undefined = undefined

  let isReady = false
  let isPlaying = false

  import Reactions from '$lib/components/Reactions.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import { icons } from '$lib/icons'
  import { t } from '$lib/i18n/i18n'
  import { load as playerLoad, toggle as playerToggle, isReady as gIsReady, isPlaying as gIsPlaying, current as gCurrent, duration as gDuration } from '$lib/player/player'

  onMount(() => {})

  $: isReady = $gIsReady
  $: isPlaying = $gIsPlaying && ($gCurrent?.src === src)
  $: localDuration = ($gCurrent?.src === src) ? $gDuration : 0

  function fmtTime(totalSeconds: number) {
    const s = Math.max(0, Math.floor(totalSeconds || 0))
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  async function toggle() {
    if (!src) return
    if ($gCurrent?.src !== src) {
      await playerLoad({ src, versionId: version_id, title, trackSlug: track_slug, coverUrl }, true)
    } else {
      playerToggle()
    }
  }
</script>

{#if src}
  <div class="waveplayer">
    <div class="waveplayer-actions">
      <button class="waveplayer-control" on:click={toggle} disabled={!isReady && $gCurrent?.src === src} aria-label={isPlaying ? $t('common.pause') : $t('common.play')} aria-pressed={isPlaying}>
        {#if isPlaying}
          <Icon icon={icons.pause} size={16} label={$t('common.pause')} />
          <span>{$t('common.pause')}</span>
        {:else}
          <Icon icon={icons.play} size={16} label={$t('common.play')} />
        {/if}
      </button>
      <Reactions targetType="version" targetId={version_id} />
    </div>
  </div>
{:else}
  <slot name="empty">{$t('audio.no_audio')}</slot>
{/if}

<style lang="stylus">
.waveplayer
  display flex
  flex-direction column
  gap .5rem

.waveplayer-actions
  display flex
  align-self stretch
  justify-content space-between
  gap .75rem
  align-items center

.waveplayer-control
  font-family var(--font-captions)
  appearance none
  border none
  background rgba(255,255,255,0.6)
  color black
  border-radius 0.25rem
  padding 0.5rem 0.75rem
  display flex
  gap 0.5rem
  align-items center
  justify-content center
  font-weight bold
  cursor pointer
  mix-blend-mode: plus-lighter
  border-bottom 3px solid rgba(0,0,0,0.2)
  transition all ease-out 0.25s
  line-height 100%

  &:disabled
    opacity .5
    cursor default

  &:active
    transform translate(0, 2px)
    opacity 0.8
</style>
