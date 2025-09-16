<script lang="ts">
  import TrackVersionItem from '$lib/components/TrackVersionItem.svelte'
  import type { Version } from '$lib/components/TrackVersionItem.svelte'
  import { t } from '$lib/i18n/i18n'

  type Track = { id: string; name: string; slug?: string }
  export let versions: Version[] = []
  export let track: Track | undefined
</script>

<section>
  {#if versions.length === 0}
    <p>{$t('tracks.no_versions')}</p>
  {:else}
    <ul class="track-versions-list">
      {#each versions as v}
        <TrackVersionItem version={v} trackTitle={track?.name} trackSlug={track?.slug} />
      {/each}
    </ul>
  {/if}
</section>

<style lang="stylus">
.track-versions-list
  list-style none
  margin 0
  padding 0
  display flex
  flex-direction column
  gap 1rem
</style>
