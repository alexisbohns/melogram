<script lang="ts">
	import MetaDate from '$lib/components/MetaDate.svelte';
	import MetaStatus from '$lib/components/MetaStatus.svelte';

	export let title: string;
	export let dateValue: string | null = null;
	export let statusText: string | null = null;
	export let statusVariant: string | null = null;
	export let icon: any = null;
	export let iconSize = 12;
</script>

<div class="track_item_header">
	<div class="track_item_name">{title}</div>
	<div class="track_item_meta">
		<MetaDate {icon} {iconSize} {dateValue} />
		<MetaStatus {statusText} {statusVariant} />
	</div>
</div>

<style lang="stylus">
.track_item_header
  display flex
  justify-content space-between
  align-items center

.track_item_name
  font-family var(--font-captions)
  font-size 1rem

.track_item_meta
  display flex
  align-items center
  gap 0.25rem
</style>
