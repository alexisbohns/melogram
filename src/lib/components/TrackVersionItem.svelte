<script lang="ts" context="module">
	export type Version = {
		id: string;
		name: string;
		resource_url?: string | null;
		release_date: string;
		description: string | null;
		status?: string | null;
	};
</script>

<script lang="ts">
	import TrackVersionFooter from '$lib/components/TrackVersionFooter.svelte';
	import TrackItemHeader from '$lib/components/TrackItemHeader.svelte';
	import { t } from '$lib/i18n/i18n';

	export let version: Version;
	export let trackTitle: string | undefined;
	export let trackId: string | undefined;
	export let trackDescription: string | null | undefined = null;
	export let trackCoverUrl: string | null | undefined = undefined;
	export let descriptionMode: 'track' | 'version' | 'none' = 'version';

	const formatDateTime = (iso: string | null | undefined) =>
		iso ? new Date(iso).toLocaleDateString() : '—';
	$: releaseDate = formatDateTime(version.release_date);
	$: statusVariant = version.status ?? null;
	$: statusText = statusVariant ? $t(`tracks.status.${statusVariant}`) : null;
	$: descriptionContent =
		descriptionMode === 'track'
			? (trackDescription ?? '')
			: descriptionMode === 'version'
				? (version.description ?? '')
				: '';
	$: showDescription = descriptionMode !== 'none' && descriptionContent.trim().length > 0;
</script>

<li class="track-version-item">
	<TrackItemHeader title={version.name} dateValue={releaseDate} {statusVariant} {statusText} />
	{#if showDescription}
		<div class="track-version-description">{descriptionContent}</div>
	{/if}
	{#if version.resource_url}
		<div class="track-version-player">
			<TrackVersionFooter
				src={version.resource_url}
				version_id={version.id}
				title={trackTitle}
				{trackId}
				coverUrl={trackCoverUrl ?? undefined}
			/>
		</div>
	{/if}
</li>

<style lang="stylus">
.track-version
  &-item
    display flex
    flex-direction column
    gap .5rem
    padding .5rem 0
  &-description
    opacity 0.4
    font-size 0.8rem
    font-weight 300   
    line-height 150%  
  &-player
    border-top 1px solid rgba(255,255,255,0.05)
    padding .5rem 0

</style>
