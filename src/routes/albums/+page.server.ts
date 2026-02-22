import type { PageServerLoad } from './$types';
import type { Album, AlbumWithTracks } from '$lib/types/albums';
import type { TrackOverview } from '$lib/types/tracks';

const LIST_URL = '/api/albums?limit=50&sort=created_desc';
const ALL_TRACKS_URL = '/api/tracks?limit=500&sort=release_desc';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const [albumsResponse, tracksResponse] = await Promise.all([
			fetch(LIST_URL),
			fetch(ALL_TRACKS_URL)
		]);

		if (!albumsResponse.ok) {
			return { albums: [], error: `Failed to load albums (${albumsResponse.status})` };
		}

		const albumsPayload = await albumsResponse.json();
		const albums: Album[] = Array.isArray(albumsPayload?.items)
			? (albumsPayload.items as Album[])
			: [];

		let tracksByAlbumId: Record<string, TrackOverview[]> = {};
		if (tracksResponse.ok) {
			const tracksPayload = await tracksResponse.json();
			const allTracks: TrackOverview[] = Array.isArray(tracksPayload?.items)
				? (tracksPayload.items as TrackOverview[])
				: [];
			tracksByAlbumId = allTracks.reduce(
				(acc, track) => {
					if (track.album_id) {
						if (!acc[track.album_id]) acc[track.album_id] = [];
						acc[track.album_id].push(track);
					}
					return acc;
				},
				{} as Record<string, TrackOverview[]>
			);
		}

		const albumsWithTracks: AlbumWithTracks[] = albums.map((album) => ({
			...album,
			tracks: tracksByAlbumId[album.id] ?? []
		}));

		return { albums: albumsWithTracks, error: null };
	} catch (err: any) {
		return { albums: [], error: err?.message ?? 'Unable to load albums' };
	}
};
