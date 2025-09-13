<script lang="ts" context="module">
  export type Version = {
    id: string
    name: string
    resource_url?: string | null
    release_date: string
  }
</script>

<script lang="ts">
  export let version: Version
  export let waveHeight: number = 48

  import WavePlayer from '$lib/components/WavePlayer.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import { icons } from '$lib/icons'
  import { t } from '$lib/i18n/i18n'

  const formatDateTime = (iso: string) => new Date(iso).toLocaleString()
</script>

<li class="track-version-item">
  <div class="track-version-item_meta">
    <div class="name">{version.name}</div>
    <div class="date">{formatDateTime(version.release_date)}</div>
  </div>
  <div class="track-version-item_actions">
    {#if version.resource_url}
      <WavePlayer src={version.resource_url} height={waveHeight} />
    {/if}
    <button aria-label={$t('common.comments')} class="comment_btn">
      <Icon icon={icons.comment} size={14} label="comment" />
      <span>{$t('common.comments')}</span>
    </button>
  </div>
</li>

<style lang="stylus">
.track-version-item
  display grid
  grid-template-columns 1fr auto
  gap .75rem 1rem
  padding .5rem 0

.track-version-item_meta .name
  font-weight 600

.track-version-item_meta .date
  opacity .6
  font-size .85rem

.track-version-item_actions
  display flex
  flex-direction column
  gap .5rem
  align-items flex-end

.comment_btn
  display inline-flex
  align-items center
  gap .4rem
  padding .25rem .5rem
  border 1px solid rgba(0,0,0,.08)
  border-radius .375rem
  background #f8fafc
  cursor pointer
  &:hover
    background #f1f5f9
</style>
