<script lang="ts">
	import AlbumPlaylistHeader from './AlbumPlaylistHeader.svelte';
	import AlbumPlaylistTrack from './AlbumPlaylistTrack.svelte';
	import { t } from '$lib/i18n/i18n';
	import type { Album } from '$lib/types/albums';
	import type { TrackOverview } from '$lib/types/tracks';
	import type { PlayerSource } from '$lib/player/player';

	export let album: Album;
	export let tracks: TrackOverview[] = [];

	$: availableTracks = tracks.filter((t) => Boolean(t.latest_version_id));
	$: upcomingTracks = tracks.filter((t) => !t.latest_version_id);
	$: playableTracks = availableTracks.filter((t) => Boolean(t.latest_resource_url));
	$: playlist = playableTracks.map(
		(t): PlayerSource => ({
			src: t.latest_resource_url as string,
			versionId: t.latest_version_id ?? undefined,
			title: t.track_name,
			trackId: t.track_id,
			coverUrl: t.album_cover_url ?? undefined,
			playSource: 'album_playlist'
		})
	);
	$: playlistIndexByTrackId = Object.fromEntries(
		playlist.map((item, idx) => [item.trackId, idx])
	) as Record<string, number>;
</script>

<article class="album-playlist">
	<AlbumPlaylistHeader {album} {playlist} />

	{#if availableTracks.length > 0}
		<div class="album-playlist-tracks">
			{#each availableTracks as track (track.track_id)}
				<AlbumPlaylistTrack
					{track}
					{playlist}
					playlistIndex={playlistIndexByTrackId[track.track_id] ?? null}
				/>
			{/each}
		</div>
	{/if}

	{#if upcomingTracks.length > 0}
		<div class="album-playlist-section">
			<p class="upcoming-label">{$t('albums.upcoming_tracks')}</p>
			<div class="album-playlist-tracks">
				{#each upcomingTracks as track (track.track_id)}
					<AlbumPlaylistTrack {track} />
				{/each}
			</div>
		</div>
	{/if}
</article>

<style lang="stylus">
.album-playlist
  display flex
  flex-direction column
  gap 0.75rem
  padding 1rem 0

  &:last-child
    border-bottom none

.album-playlist-tracks
  display flex
  flex-direction column

.album-playlist-section
  display flex
  flex-direction column
  gap 0.5rem

.upcoming-label
  font-family var(--font-captions)
  font-size 0.8rem
  letter-spacing 0.06em
  text-transform uppercase
  opacity 0.5
  margin 0
</style>
