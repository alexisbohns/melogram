<script lang="ts">
  import { onDestroy, onMount } from 'svelte'

  export let src: string | null | undefined
  export let height: number = 64
  export let version_id: string
  export let waveColor: string = '#8f8572' // gray-400
  export let progressColor: string = 'white' // gray-900
  export let cursorColor: string = '#a1a6a1' // gray-500
  export let barWidth: number | null = 2
  export let barGap: number | null = 2
  export let barRadius: number | null = 4
  export let autoplay: boolean = false

  let isReady = false
  let isPlaying = false

  import Reactions from '$lib/components/Reactions.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import { icons } from '$lib/icons'
  import { t } from '$lib/i18n/i18n'
  import { load as playerLoad, toggle as playerToggle, isReady as gIsReady, isPlaying as gIsPlaying, current as gCurrent } from '$lib/player/player'

  onMount(() => {})

  $: isReady = $gIsReady
  $: isPlaying = $gIsPlaying && ($gCurrent?.src === src)

  async function toggle() {
    if (!src) return
    if ($gCurrent?.src !== src) {
      await playerLoad({ src, versionId: version_id }, true)
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
  // width 100px

  &:disabled
    opacity .5
    cursor default

  &:active
    transform translate(0, 2px)
    opacity 0.8

.waveplayer-wave
  display none
</style>
