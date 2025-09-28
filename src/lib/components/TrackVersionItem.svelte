<script lang="ts" context="module">
  export type Version = {
    id: string
    name: string
    resource_url?: string | null
    release_date: string
    description: string | null
  }
</script>

<script lang="ts">
  export let version: Version
  export let trackTitle: string | undefined
  export let trackSlug: string | undefined
  import TrackVersionFooter from '$lib/components/TrackVersionFooter.svelte'
  import TrackItemHeader from '$lib/components/TrackItemHeader.svelte'

  const formatDateTime = (iso: string) => new Date(iso).toLocaleDateString()
  $: releaseDate = formatDateTime(version.release_date)
</script>

<li class="track-version-item">
  <TrackItemHeader title={version.name} dateValue={releaseDate} />
  <div class="track-version-description">{version.description}</div>
  {#if version.resource_url}
    <div class="track-version-player">
      <TrackVersionFooter src={version.resource_url} version_id={version.id} title={trackTitle} track_slug={trackSlug} />
    </div>
  {/if}
</li>

<style lang="stylus">
.track-version
  &-item
    display flex
    flex-direction column
    gap .5rem
    padding .5rem 0
  &-description
    opacity 0.4
    font-size 0.8rem
    font-weight 300   
    line-height 150%  

</style>
