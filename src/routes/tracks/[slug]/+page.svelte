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
  import AudioPlayer from '$lib/components/AudioPlayer.svelte'
</script>

{#if error}
  <p class="text-red-600">{error}</p>
{:else if !track}
  <p>Introuvable.</p>
{:else}
  <section>
    <header>
        <BackButton/>
      <h1>{track.name}</h1>
      {#if track.cover_url}<img src={track.cover_url} alt={track.name} />{/if}
      {#if track.description}<p>{track.description}</p>{/if}
    </header>

    <div>
      <button>Featured</button>
      <button>Historique</button>
    </div>

    <!-- featured -->
    {#if featured}
      <article>
        <h2>Version mise en avant</h2>
        <div>
          <p>Slug: {featured.name}</p>
          {#if featured.resource_url}
            <AudioPlayer src={featured.resource_url} />
          {:else}
            <p>Pas d’audio pour cette version.</p>
          {/if}
          <!-- comments tbd -->
        </div>
      </article>
    {/if}

    <!-- history -->
    <section>
      <h3>Versions antérieures</h3>
      {#if older.length === 0}
        <p>Aucune autre version.</p>
      {:else}
        <ul>
          {#each older as v}
            <li>
              <div>
                <div>{v.name}</div>
                <div>{formatDateTime(v.created_at)}</div>
              </div>
              <div>
                {#if v.resource_url}
                  <AudioPlayer src={v.resource_url} />
                {/if}
                <!-- version sheet trigger -->
                <button>Commentaires</button>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  </section>
{/if}
