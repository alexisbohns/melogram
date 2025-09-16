<script lang="ts">
  type Version = {
    id: string
    name: string
    resource_url?: string | null
    release_date: string
  }

  type Track = {
    id: string
    slug: string
    name: string
    description?: string | null
    cover_url?: string | null
    created_at: string
    lyrics?: string | null
  }

  export let data: {
    track: Track | null
    versions: Version[]
    error: string | null
  }

  const { track, versions, error } = data

  $: sorted = (versions ?? []).slice().sort((a, b) =>
    new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
  )

  import Tabs from '$lib/components/Tabs.svelte'
  import TrackHeader from '$lib/components/TrackHeader.svelte'
  import { t } from '$lib/i18n/i18n'
  import TrackTimeline from '$lib/components/TrackTimeline.svelte'
  import TrackVersions from '$lib/components/TrackVersions.svelte'
  import TrackLyrics from '$lib/components/TrackLyrics.svelte'
  let tab: 'timeline' | 'versions' | 'lyrics' = 'timeline'
</script>

{#if error}
  <p class="error">{error}</p>
{:else if !track}
  <p>{$t('tracks.not_found')}</p>
{:else}
  <section>
    <TrackHeader {track} />

    <Tabs
      items={[
        { id: 'timeline', label: $t('common.timeline') },
        { id: 'versions', label: $t('common.versions') },
        { id: 'lyrics', label: $t('common.lyrics') }
      ]}
      bind:value={tab}
      ariaLabel={$t('common.versions')}
    />

    {#if tab === 'timeline'}
      <TrackTimeline {track} versions={sorted} />
    {:else if tab === 'versions'}
      <TrackVersions versions={sorted} />
    {:else}
      <TrackLyrics {track} />
    {/if}
  </section>
{/if}

<style lang="stylus">
  // tabs styles moved to Tabs.svelte
  .error
    color #dc2626
</style>
