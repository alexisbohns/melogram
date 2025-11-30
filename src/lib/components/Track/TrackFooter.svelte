<script lang="ts">
	import MetaDate from '$lib/components/MetaDate.svelte';
	import MetaStatus from '$lib/components/MetaStatus.svelte';
	import Reactions from '$lib/components/Reactions.svelte';
	import { t } from '$lib/i18n/i18n';

	export let latest_status: string | null = null;
	export let latest_release_date: string | null = null;
	export let track_id: string;

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
	<Reactions targetType="track" targetId={track_id} />
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

:global(.track-footer .reactions)
  gap 0.6rem

:global(.track-footer .reactions-item)
  opacity 0.7
</style>
