<script lang="ts">
  type Version = {
    id: string
    name: string
    resource_url?: string | null
    created_at: string
  }

  type Track = {
    id: string
    slug: string
    name: string
    description?: string | null
    cover_url?: string | null
    created_at: string
  }

  export let data: {
    track: Track | null
    versions: Version[]
    error: string | null
  }

  const { track, versions, error } = data

  // avoid inline `new Date(...)` in markup and to keep SSR-safe formatting
  const formatDateTime = (iso: string) => new Date(iso).toLocaleString()

  $: sorted = (versions ?? []).slice().sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  $: featured = sorted[0]
  $: older = sorted.slice(1)

  import BackButton from '$lib/components/BackButton.svelte'
  import WavePlayer from '$lib/components/WavePlayer.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import { icons } from '$lib/icons'
  import Tabs from '$lib/components/Tabs.svelte'
  import TrackHeader from '$lib/components/TrackHeader.svelte'
  import TrackVersionItem from '$lib/components/TrackVersionItem.svelte'
  let tab: 'featured' | 'history' = 'featured'
</script>

{#if error}
  <p class="text-red-600">{error}</p>
{:else if !track}
  <p>Introuvable.</p>
{:else}
  <section>
    <TrackHeader {track} />

    <Tabs
      items={[
        { id: 'featured', label: 'Mise en avant' },
        { id: 'history', label: 'Historique' }
      ]}
      bind:value={tab}
      ariaLabel="Versions"
    />

    {#if tab === 'featured'}
      {#if featured}
        <article>
          <div>
            <p>Slug: {featured.name}</p>
            {#if featured.resource_url}
              <WavePlayer src={featured.resource_url} />
            {:else}
              <p>Pas d’audio pour cette version.</p>
            {/if}
            <!-- comments tbd -->
          </div>
        </article>
      {:else}
        <p>Aucune version en avant.</p>
      {/if}
    {:else}
      <section>
        {#if older.length === 0}
          <p>Aucune autre version.</p>
        {:else}
          <ul class="track-versions-timeline">
            {#each older as v}
              <TrackVersionItem version={v} />
            {/each}
          </ul>
        {/if}
      </section>
    {/if}
  </section>
{/if}

<style lang="stylus">
  // tabs styles moved to Tabs.svelte
  
</style>
