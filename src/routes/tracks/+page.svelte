<script lang="ts">
  import { goto } from '$app/navigation'
  export let data
  const { tracks, error } = data

  function openTrack(slug: string) {
    goto(`/tracks/${slug}`)
  }
</script>

<section>
  <header>
    <h1>Morceaux</h1>
    {#if error}<p class="text-red-600">{error}</p>{/if}
  </header>

  {#if tracks.length === 0}
    <p>Aucun morceau.</p>
  {:else}
    <div>
      {#each tracks as t}
        <a href={`/tracks/${t.slug}`} class="hover:text-black/60">
          <div>{t.name}</div>
          <div>{new Date(t.created_at).toLocaleDateString()}</div>
        </a>
      {/each}
    </div>
  {/if}
</section>