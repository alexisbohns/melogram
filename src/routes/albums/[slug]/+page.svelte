<script lang="ts">
	import { t } from '$lib/i18n/i18n';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import type { Album } from '$lib/types/albums';

	export let data: { album: Album | null; error: string | null };

	const { album, error } = data;

	$: crumbs = [
		{ label: $t('common.home'), href: '/' },
		{ label: $t('albums.title'), href: '/albums' },
		...(album ? [{ label: album.name }] : [])
	];
</script>

<svelte:head>
	<title>{album ? album.name : $t('albums.title')}</title>
</svelte:head>

{#if error}
	<p class="error">{error}</p>
{:else if !album}
	<p class="empty">{$t('albums.not_found')}</p>
{:else}
	<section class="album-page">
		<Breadcrumbs items={crumbs} ariaLabel={$t('albums.title')} />

		<header class="album-header">
			<h1>{album.name}</h1>
			{#if album.description}
				<p class="album-description">{album.description}</p>
			{/if}
		</header>

		{#if album.cover_url}
			<div class="album-cover">
				<img src={album.cover_url} alt={album.name} loading="lazy" />
			</div>
		{/if}
	</section>
{/if}

<style lang="stylus">
.album-page
  display flex
  flex-direction column
  gap 1.5rem

.album-header
  display flex
  flex-direction column
  gap 0.4rem

  h1
    font-family var(--font-captions)
    font-size 2.2rem
    letter-spacing 0.07em
    line-height 1.2

.album-description
  color var(--tertiary)
  opacity 0.85
  font-size 1.05rem
  line-height 1.55

.album-cover
  align-self center
  width 100%
  max-width 400px

  img
    width 100%
    height auto
    display block
    border-radius 1rem
    box-shadow 0 18px 60px rgba(0,0,0,0.35)

.empty, .error
  opacity 0.75
  font-size 0.95rem

.error
  color #dc2626
</style>
