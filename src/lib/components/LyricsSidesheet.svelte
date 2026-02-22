<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { icons } from '$lib/icons';
	import { t } from '$lib/i18n/i18n';
	import { createEventDispatcher } from 'svelte';

	export let lyrics: string | null | undefined = null;
	export let open: boolean = false;

	const dispatch = createEventDispatcher<{ close: void }>();

	function handleKeydown(e: KeyboardEvent) {
		if (open && e.key === 'Escape') {
			dispatch('close');
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<div class="lyrics-sidesheet" role="dialog" aria-modal="true" aria-label={$t('common.show_lyrics')}>
		<div class="lyrics-sidesheet-header">
			<h2>{$t('common.show_lyrics')}</h2>
			<button
				type="button"
				class="close-button"
				on:click={() => dispatch('close')}
				aria-label={$t('common.close')}
			>
				<Icon icon={icons.xmark} size={16} label={$t('common.close')} />
			</button>
		</div>
		<div class="lyrics-sidesheet-body">
			{#if lyrics}
				<div class="lyrics">{lyrics}</div>
			{:else}
				<p class="no-lyrics">{$t('tracks.no_lyrics')}</p>
			{/if}
		</div>
	</div>
{/if}

<style lang="stylus">
.lyrics-sidesheet
  position fixed
  top 0
  right 0
  bottom 0
  width min(400px, 90vw)
  background var(--background, #1a1a2e)
  border-left 1px solid rgba(255,255,255,0.1)
  z-index 100
  display flex
  flex-direction column
  overflow hidden

.lyrics-sidesheet-header
  display flex
  align-items center
  justify-content space-between
  padding 1rem 1.25rem
  border-bottom 1px solid rgba(255,255,255,0.08)

  h2
    margin 0
    font-family var(--font-headings)
    font-size 1.1rem

.close-button
  background none
  border none
  color inherit
  cursor pointer
  opacity 0.5
  padding 0.25rem
  display flex
  align-items center
  justify-content center
  transition opacity 0.15s ease-out

  &:hover
    opacity 1

.lyrics-sidesheet-body
  flex 1
  overflow-y auto
  padding 1.25rem

.lyrics
  white-space pre-wrap
  line-height 1.6

.no-lyrics
  opacity 0.5
  font-size 0.9rem
</style>
