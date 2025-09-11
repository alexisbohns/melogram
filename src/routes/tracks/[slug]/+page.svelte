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
  let tab: 'featured' | 'history' = 'featured'
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

    <div class="tabs" role="tablist" aria-label="Versions">
      <button
        role="tab"
        class:active={tab === 'featured'}
        aria-selected={tab === 'featured'}
        tabindex={tab === 'featured' ? 0 : -1}
        on:click={() => (tab = 'featured')}
      >Mise en avant</button>
      <button
        role="tab"
        class:active={tab === 'history'}
        aria-selected={tab === 'history'}
        tabindex={tab === 'history' ? 0 : -1}
        on:click={() => (tab = 'history')}
      >Historique</button>
    </div>

    {#if tab === 'featured'}
      {#if featured}
        <article>
          <h2>Version mise en avant</h2>
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
                    <WavePlayer src={v.resource_url} height={48} />
                  {/if}
                  <button aria-label="Commentaires" class="comment_btn">
                    <Icon icon={icons.comment} size={14} label="comment"/>
                    <span>Commentaires</span>
                  </button>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}
  </section>
{/if}

<style lang="stylus">
  h1
    font-family "Seaweed Script"
    font-size 2rem

  .tabs
    display flex
    gap 2rem
    justify-content center
    margin 1rem 0

  .tabs > button
    appearance none
    background transparent
    opacity 0.5
    border none
    padding .5rem 1rem
    border-bottom 2px solid transparent
    cursor pointer
    display flex
    flex-direction column
    align-items center

    &::after
      content "•"
      opacity 0

    &:hover
      opacity 0.8

      &::after
        opacity 0.5

  .tabs > button.active, .tabs > button[aria-selected="true"]
    opacity 1

    &::after
      content "•"
      opacity 1

  .comment_btn
    display inline-flex
    align-items center
    gap .4rem
    padding .25rem .5rem
    border 1px solid rgba(0,0,0,.08)
    border-radius .375rem
    background #f8fafc
    &:hover
      background #f1f5f9
</style>
