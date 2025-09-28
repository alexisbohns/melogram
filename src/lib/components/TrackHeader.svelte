<script lang="ts" context="module">
  export type Track = {
    id: string
    slug: string
    name: string
    description?: string | null
    cover_url?: string | null
    created_at: string
  }
</script>

<script lang="ts">
  export let track: Track
  import BackButton from '$lib/components/BackButton.svelte'
</script>

<header class="track-header">
  <BackButton />
  {#if track.cover_url}
  <img src={track.cover_url} alt={track.name} />
  {/if}
  <h1 class="track-name">{track.name}</h1>
  {#if track.description}
    <p class="track-description">{track.description}</p>
  {/if}
  <slot />
</header>

<style lang="stylus">
.track-header
  display flex
  flex-direction column
  align-items center
  gap .5rem

  h1
    font-family var(--font-headings)
    font-size 2rem

  img
    width 100%
    max-width 200px
    border-radius .5rem

  .track-description
    opacity 0.5
</style>
