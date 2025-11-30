<script lang="ts">
	import Track from '$lib/components/Track/Track.svelte';
	import { t } from '$lib/i18n/i18n';
	import type { TrackOverview } from '$lib/types/tracks';
	import SectionHeading from '$lib/components/SectionHeading.svelte';

	export let data: { tracks: TrackOverview[]; error: string | null };

	const { tracks = [], error = null } = data;

	$: availableTracks = tracks.filter((t) => Boolean(t.latest_version_id));
	$: upcomingTracks = tracks.filter((t) => !t.latest_version_id);
	$: playableTracks = tracks.filter((t) => Boolean(t.latest_resource_url));
	$: playlist = playableTracks.map((t) => ({
		src: t.latest_resource_url as string,
		versionId: t.latest_version_id ?? undefined,
		title: t.track_name,
		trackId: t.track_id,
		coverUrl: t.album_cover_url ?? undefined
	}));
	$: playlistIndexByTrackId = Object.fromEntries(
		playlist.map((item, idx) => [item.trackId, idx])
	) as Record<string, number>;
</script>

<svelte:head>
	<title>{$t('tracks.latests')}</title>
</svelte:head>

<section class="tracks-page">
	<header class="tracks-heading">
		<h1>{$t('tracks.latests')}</h1>
	</header>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	{#if tracks.length === 0 && !error}
		<p class="empty">{$t('tracks.none')}</p>
	{:else if tracks.length > 0}
		{#if availableTracks.length > 0}
			<section class="tracks-section">
				<SectionHeading>{$t('tracks.available')}</SectionHeading>
				<div class="tracks-list">
					{#each availableTracks as track (track.track_id)}
						<Track
							{track}
							variant="featured"
							{playlist}
							playlistIndex={playlistIndexByTrackId[track.track_id] ?? null}
						/>
					{/each}
				</div>
			</section>
		{/if}

		{#if upcomingTracks.length > 0}
			<section class="tracks-section tracks-upcoming">
				<SectionHeading>{$t('tracks.upcoming')}</SectionHeading>
				<div class="tracks-list">
					{#each upcomingTracks as track (track.track_id)}
						<Track {track} muted />
					{/each}
				</div>
			</section>
		{/if}

		{#if availableTracks.length === 0 && upcomingTracks.length === 0}
			<p class="empty">{$t('tracks.none')}</p>
		{/if}
	{/if}
</section>

<style lang="stylus">
.tracks-page
  display flex
  flex-direction column
  gap 1.25rem

.tracks-heading
  display flex
  flex-direction column
  gap 0.35rem

  h1
    font-family var(--font-captions)
    font-size 2rem
    letter-spacing 0.07em

.tracks-section
  display flex
  flex-direction column
  gap 1rem
  padding 1rem 0
  border-top 1px solid rgba(255,255,255,0.05)

  &:first-of-type
    border-top none
    padding-top 0

.tracks-list
  display flex
  flex-direction column
  gap 0.75rem

.empty, .error
  opacity 0.75
  font-size 0.95rem

.error
  color #dc2626
</style>
