<script lang="ts">
	import MetaDate from '$lib/components/MetaDate.svelte';
	import MetaStatus from '$lib/components/MetaStatus.svelte';
	import LikeButton from '$lib/components/LikeButton.svelte';
	import { t } from '$lib/i18n/i18n';

	export let latest_status: string | null = null;
	export let latest_release_date: string | null = null;
	export let track_id: string;
	export let like_count: number = 0;
	export let liked_by_me: boolean = false;

	const formatDate = (iso: string | null) => {
		if (!iso) return null;
		const date = new Date(iso);
		return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('fr-FR');
	};

	$: dateValue = formatDate(latest_release_date);
	$: statusVariant = latest_status ? latest_status.toLowerCase() : null;
	$: statusText = statusVariant ? $t(`tracks.status.${statusVariant}`) : null;
</script>

<footer class="track-footer">
	<div class="track-footer-meta">
		<MetaStatus {statusText} {statusVariant} />
		<MetaDate {dateValue} />
	</div>
	<LikeButton trackId={track_id} likeCount={like_count} likedByMe={liked_by_me} />
</footer>

<style lang="stylus">
.track-footer
  display flex
  justify-content space-between
  align-items center
  gap 0.75rem
  flex-wrap wrap

  &-meta
    display flex
    align-items center
    gap 0.5rem
    opacity 0.9
</style>
