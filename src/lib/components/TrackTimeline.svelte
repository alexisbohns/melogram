<script lang="ts">
	import TrackVersionItem from '$lib/components/TrackVersionItem.svelte';
	import type { Version } from '$lib/components/TrackVersionItem.svelte';
	import { t } from '$lib/i18n/i18n';

	type Track = {
		id: string;
		name: string;
		slug?: string;
		description?: string | null;
		cover_url?: string | null;
	};

	export let track: Track;
	export let versions: Version[] = [];
</script>

<section>
	{#if versions.length === 0}
		<p>{$t('tracks.no_versions')}</p>
	{:else}
		<ul class="track-versions-timeline">
			{#each versions as v}
				<TrackVersionItem
					version={v}
					trackTitle={track.name}
					trackSlug={track.slug}
					trackDescription={track.description}
					trackCoverUrl={track.cover_url}
					descriptionMode="version"
				/>
			{/each}
		</ul>
	{/if}
</section>

<style lang="stylus">
.track-versions-timeline
  list-style none
  margin 0
  padding 0
  display flex
  flex-direction column
  gap 1rem
</style>
