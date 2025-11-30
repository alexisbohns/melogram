export type TrackOverview = {
	track_id: string;
	track_name: string;
	track_description: string | null;
	album_id: string | null;
	album_name: string | null;
	album_cover_url: string | null;
	latest_status: string | null;
	latest_resource_url: string | null;
	latest_release_date: string | null;
	latest_version_id: string | null;
};
