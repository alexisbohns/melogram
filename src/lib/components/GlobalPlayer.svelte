<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import PlayerControlButton from '$lib/components/PlayerControlButton.svelte';
	import { t } from '$lib/i18n/i18n';
	import {
		attach,
		detach,
		current,
		isPlaying,
		isReady,
		toggle,
		time,
		duration,
		queue,
		repeatMode,
		next,
		previous,
		setRepeat
	} from '$lib/player/player';
	import Icon from '$lib/components/Icon.svelte';
	import { icons } from '$lib/icons';

	let containerEl: HTMLDivElement | null = null;

	onMount(() => {
		if (containerEl) attach(containerEl);
	});

	// attach when the element becomes available after first track loads
	$: if (containerEl) attach(containerEl);

	onDestroy(() => detach());

	$: hasTrack = $current !== null;
	$: hasQueue = ($queue?.length ?? 0) > 0;

	function fmtTime(totalSeconds: number) {
		const s = Math.max(0, Math.floor(totalSeconds || 0));
		const m = Math.floor(s / 60);
		const sec = s % 60;
		return `${m}:${sec.toString().padStart(2, '0')}`;
	}
	$: formattedCurrent = fmtTime($time);
	$: formattedRemaining = `-${fmtTime(Math.max(0, $duration - $time))}`;

	function handleNext() {
		next($isPlaying);
	}

	function handlePrevious() {
		previous($isPlaying);
	}

	function cycleRepeat() {
		if ($repeatMode === 'all') setRepeat('one');
		else if ($repeatMode === 'one') setRepeat('none');
		else setRepeat('all');
	}

	$: repeatLabel =
		$repeatMode === 'all' ? 'Repeat all' : $repeatMode === 'one' ? 'Repeat one' : 'Repeat off';
</script>

{#if hasTrack}
	<div class="global-player-wrapper">
		<div class="global-player" role="complementary" aria-label={$t('audio.player')}>
			<div class="global-player-title">
				{#if $current?.trackId}
					<a href={`/tracks/${$current.trackId}`} class="title-link">{$current?.title}</a>
				{:else}
					{$current?.title}
				{/if}
			</div>
			<div class="global-player-controls">
				<button
					type="button"
					class="global-icon-button"
					on:click={handlePrevious}
					disabled={!hasQueue}
					aria-label="Previous track"
				>
					<Icon icon={icons.backwardStep} size={14} label="Previous track" />
				</button>
				<PlayerControlButton on:click={toggle} disabled={!$isReady} isPlaying={$isPlaying} />
				<button
					type="button"
					class="global-icon-button"
					on:click={handleNext}
					disabled={!hasQueue}
					aria-label="Next track"
				>
					<Icon icon={icons.forwardStep} size={14} label="Next track" />
				</button>
				<span class="timecode current">{formattedCurrent}</span>
				<div class="global-player-wave" bind:this={containerEl}></div>
				<span class="timecode remaining">{formattedRemaining}</span>
				<button
					type="button"
					class={`global-icon-button repeat ${$repeatMode == 'all' ? 'all' : ''} ${$repeatMode == 'one' ? 'one' : ''}`}
					on:click={cycleRepeat}
					aria-label={repeatLabel}
					aria-pressed={$repeatMode !== 'none'}
					title={repeatLabel}
				>
					<Icon icon={icons.repeat} size={14} label={repeatLabel} />
					{#if $repeatMode === 'one'}
						<span class="repeat-indicator">1</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style lang="stylus">
.global-player-wrapper
  position fixed
  left 0
  right 0
  bottom 0
  z-index 100
  padding 1rem
  max-width 700px
  margin auto

  @media screen and (min-width: 768px)
    padding-bottom 0
    

.global-player
  padding 1rem
  border-radius 1rem
  background rgba(0,0,0,0.4)
  backdrop-filter blur(10px)
  border 1px solid rgba(0,0,0,0.1)
  display flex
  flex-direction column
  gap 0.5rem

  @media screen and (min-width: 768px)
    border-radius 1rem 1rem 0 0

.global-player-title
  font-family var(--font-captions)
  font-size 1rem
  color var(--default)
  white-space nowrap
  overflow hidden
  text-overflow ellipsis

.global-player-title .title-link
  color inherit
  text-decoration none
  &:hover
    text-decoration underline

.global-player-controls
  display flex
  align-items center
  gap .75rem

.global-icon-button
  appearance none
  border none
  // background rgba(255,255,255,0.08)
  color var(--default)
  min-width 2rem
  min-height 2rem
  border-radius 50%
  display inline-flex
  align-items center
  justify-content center
  cursor pointer
  transition all 0.2s ease-out

  &:hover:enabled
    background rgba(255,255,255,0.14)

  &:active:enabled
    transform translateY(1px)

  &:disabled
    opacity 0.4
    cursor default

.global-icon-button.repeat
  position relative

.global-icon-button.repeat.all
  background var(--primary)
  color var(--background)
  transform rotate(180deg)

.global-icon-button.repeat.one
  background var(--tertiary)
  color var(--background)
  transform rotate(360deg)

.repeat-indicator
  position absolute
  right 4px
  bottom 4px
  font-size 0.65rem
  font-weight 700
  line-height 1

.timecode
  font-variant-numeric tabular-nums
  font-family var(--font-captions)
  font-size .9rem
  opacity .8
  min-width 4ch
  text-align center

.global-player-wave
  width 100%

</style>
