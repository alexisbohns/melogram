<script lang="ts">
	import AlbumsList from '$lib/components/Album/AlbumsList.svelte';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import { t } from '$lib/i18n/i18n';
	import type { Album } from '$lib/types/albums';

	export let data: { albums: Album[]; error: string | null };

	const { albums = [], error = null } = data;

	$: crumbs = [{ label: $t('common.home'), href: '/' }, { label: $t('albums.title') }];
</script>

<svelte:head>
	<title>{$t('albums.title')}</title>
</svelte:head>

<section class="albums-page">
	<Breadcrumbs items={crumbs} ariaLabel={$t('albums.title')} />

	<header class="albums-heading">
		<h1>{$t('albums.collection_title')}</h1>
	</header>

	<AlbumsList {albums} {error} />
</section>

<style lang="stylus">
.albums-page
  display flex
  flex-direction column
  gap 1.25rem

.albums-heading
  display flex
  flex-direction column
  gap 0.35rem
  margin 0.25rem 0 0.5rem

  h1
    font-family var(--font-captions)
    font-size 2.1rem
    letter-spacing 0.07em

</style>
