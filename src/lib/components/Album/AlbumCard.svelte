<script lang="ts">
	import Cover from '$lib/components/Track/Cover.svelte';
	import type { Album } from '$lib/types/albums';

	export let album: Album;
</script>

<a class="album-card" href={`/albums/${album.id}`}>
	<Cover cover_url={album.cover_url} alt={album.name} display="large" />
	<div class="album-card-body">
		<h2>{album.name}</h2>
		{#if album.description}
			<p>{album.description}</p>
		{/if}
	</div>
</a>

<style lang="stylus">
.album-card
  display flex
  gap 1rem
  align-items center
  text-decoration none
  padding 1rem 0
  transition opacity 0.2s ease-out

  &:last-child
    border-bottom none

  &:hover
    opacity 0.9

.album-card-body
  display flex
  flex-direction column
  gap 0.35rem
  min-width 0

  h2
    font-family var(--font-captions)
    font-size 1.1rem
    letter-spacing 0.05em
    line-height 1.2
    margin 0
    word-break break-word

  p
    margin 0
    color var(--tertiary)
    opacity 0.85
    line-height 1.45
    font-size 0.8rem
    word-break break-word
</style>
