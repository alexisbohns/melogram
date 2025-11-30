<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { t } from '$lib/i18n/i18n';

	export let dateValue: string | null = null;
	export let icon: any = null;
	export let iconSize = 12;
</script>

{#if icon || dateValue !== null}
	<div class="track_item_date">
		{#if icon}
			<Icon {icon} size={iconSize} label={$t('tracks.latests')} />
		{/if}
		{#if dateValue !== null}
			<span>{dateValue}</span>
		{/if}
	</div>
{/if}

<style lang="stylus">
.track_item_date
  font-family var(--font-captions)
  display flex
  align-items center
  justify-content flex-end
  gap 0.125rem
  opacity 0.3
  font-size 0.8rem
</style>
