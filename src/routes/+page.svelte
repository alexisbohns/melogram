<script lang="ts">
  export let data
  const { tracks, error } = data
</script>

<section>
  <header>
    <h1>Morceaux</h1>
    {#if error}<p class="text-red-600">{error}</p>{/if}
  </header>

  {#if tracks.length === 0}
    <p>Aucun morceau.</p>
  {:else}
    <div class="tracks_list">
      {#each tracks as t}
        <a href={`/tracks/${t.slug}`} class="track_item">
          <div class="track_item_name">{t.name}</div>
          <div class="track_item_date">
            Dernière version : {t.latest_release ? new Date(t.latest_release).toLocaleDateString() : '—'}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</section>

<style lang="stylus">
  .tracks_list
      display flex
      flex-direction column
      gap 1rem

  .track
    &_item
      display flex
      flex-direction column

      &:hover
        opacity 0.5

      &_name
        font-family "Seaweed Script"
        font-size 2rem

      &_date
        opacity 0.25
        font-size 1rem
</style>