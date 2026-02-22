<script lang="ts">
	type Version = {
		id: string;
		name: string;
		resource_url?: string | null;
		release_date: string;
		description: string | null;
		status: string | null;
	};

	type Track = {
		id: string;
		slug: string;
		name: string;
		description?: string | null;
		cover_url?: string | null;
		created_at: string;
		lyrics?: string | null;
	};

	import type { User } from '@supabase/supabase-js';

	export let data: {
		track: Track | null;
		versions: Version[];
		likeCount: number;
		likedByMe: boolean;
		canAnswer: boolean;
		error: string | null;
		user?: User | null;
	};

	const { track, versions, error } = data;
	$: user = data.user ?? null;
	$: likeCount = data.likeCount ?? 0;
	$: likedByMe = data.likedByMe ?? false;
	$: canAnswer = data.canAnswer ?? false;

	$: sorted = (versions ?? [])
		.slice()
		.sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime());

	$: latestVersion = sorted.length > 0 ? sorted[0] : null;

	import TrackHeader from '$lib/components/TrackHeader.svelte';
	import TrackHeaderActions from '$lib/components/TrackHeaderActions.svelte';
	import TrackActivity from '$lib/components/TrackActivity.svelte';
	import LyricsSidesheet from '$lib/components/LyricsSidesheet.svelte';
	import { t } from '$lib/i18n/i18n';

	let lyricsOpen = false;
</script>

{#if error}
	<p class="error">{error}</p>
{:else if !track}
	<p>{$t('tracks.not_found')}</p>
{:else}
	<section>
		<TrackHeader {track}>
			<TrackHeaderActions
				trackId={track.id}
				trackName={track.name}
				coverUrl={track.cover_url}
				latestVersionId={latestVersion?.id ?? null}
				latestResourceUrl={latestVersion?.resource_url ?? null}
				{likeCount}
				{likedByMe}
				hasLyrics={!!track.lyrics}
				on:toggleLyrics={() => (lyricsOpen = !lyricsOpen)}
			/>
		</TrackHeader>

		<TrackActivity {track} versions={sorted} {user} {canAnswer} />
	</section>

	<LyricsSidesheet lyrics={track.lyrics} open={lyricsOpen} on:close={() => (lyricsOpen = false)} />
{/if}

<style lang="stylus">
  .error
    color #dc2626
</style>
