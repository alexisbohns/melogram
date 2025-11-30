<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { t } from '$lib/i18n/i18n';

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
		{#if statusText}
			<span
				class={`track_item_status${statusVariant ? ` track_item_status_${statusVariant}` : ''}`}
			>
				{statusText}
			</span>
		{/if}
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

.track_item_status
  font-family var(--font-captions)
  text-transform uppercase
  font-size 0.6rem
  letter-spacing 0.05em
  padding 0.15rem 0.5rem
  border-radius 9999px
  background var(--primary)
  color var(--tertiary)

  &.track_item_status_draft
    background rgba(tomato,0.2)
    color rgba(tomato, 0.5)

  &.track_item_status_prototype
    background rgba(khaki,0.2)
    color rgba(khaki,0.5)

  &.track_item_status_demo
    background rgba(darkseagreen,0.2)
    color rgba(darkseagreen,0.6)

.track_item_date
  font-family var(--font-captions)
  display flex
  align-items center
  justify-content flex-end
  gap 0.125rem
  opacity 0.3
  font-size 0.8rem
</style>
