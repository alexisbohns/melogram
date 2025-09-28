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
  export let trackTitle: string | undefined
  export let trackSlug: string | undefined
  import TrackVersionFooter from '$lib/components/TrackVersionFooter.svelte'

  const formatDateTime = (iso: string) => new Date(iso).toLocaleString()
</script>

<li class="track-version-item">
  <div class="track-version-item_meta">
    <div class="name">{version.name}</div>
    <div class="date">{formatDateTime(version.release_date)}</div>
  </div>
  {#if version.resource_url}
    <div class="track-version-player">
      <TrackVersionFooter src={version.resource_url} version_id={version.id} title={trackTitle} track_slug={trackSlug} />
    </div>
  {/if}
</li>

<style lang="stylus">
.track-version-item
  display flex
  flex-direction column
  gap .5rem
  padding .5rem 0

.track-version-item_meta .name
  font-weight 600

.track-version-item_meta .date
  opacity .6
  font-size .85rem
</style>
