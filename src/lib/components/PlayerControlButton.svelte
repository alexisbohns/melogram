<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { icons } from '$lib/icons';
	import { t } from '$lib/i18n/i18n';

	export let isPlaying = false;
	export let disabled = false;
	export let upcoming = false;

	const dispatch = createEventDispatcher<{ click: MouseEvent }>();

	function handleClick(event: MouseEvent) {
		if (upcoming) return;
		dispatch('click', event);
	}
</script>

<button
	type="button"
	class="player-control {isPlaying ? 'playing' : ''} {upcoming ? 'upcoming' : ''}"
	on:click={handleClick}
	disabled={disabled || upcoming}
	aria-label={upcoming ? $t('tracks.upcoming') : isPlaying ? $t('common.pause') : $t('common.play')}
	aria-pressed={!upcoming ? isPlaying : undefined}
>
	{#if upcoming}
		<Icon icon={icons.hourglass} size={14} label={$t('tracks.upcoming')} />
	{:else if isPlaying}
		<Icon icon={icons.pause} size={16} label={$t('common.pause')} />
	{:else}
		<Icon icon={icons.play} size={16} label={$t('common.play')} />
	{/if}
</button>

<style lang="stylus">
.player-control
  font-family var(--font-captions)
  appearance none
  border none
  background var(--primary)
  color black
  border-radius 5rem
  width 2rem
  min-width 2rem
  height 2rem
  min-height 2rem
  display flex
  gap 0.5rem
  align-items center
  justify-content center
  font-weight bold
  cursor pointer
  mix-blend-mode: plus-lighter
  transition all ease-out 0.25s
  line-height 100%
  padding-left 0.125rem

  &.playing
    background var(--tertiary)
    padding-left 0
    opacity 1
    mix-blend-mode unset
    color var(--background)

  &.upcoming
    background transparent
    mix-blend-mode plus-lighter
    opacity 0.4
    padding-left 0
    cursor default

  &:disabled
    opacity .5
    cursor default

  &:active
    transform translate(0, 2px)
    opacity 0.8

  &.upcoming:active
    transform none
</style>
