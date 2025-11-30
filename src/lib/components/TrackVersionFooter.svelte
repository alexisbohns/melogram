<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	export let src: string | null | undefined;
	export let version_id: string;
	export let title: string | undefined;
	export let trackId: string | undefined;
	export let coverUrl: string | undefined = undefined;

	let isReady = false;
	let isPlaying = false;

	import Reactions from '$lib/components/Reactions.svelte';
	import PlayerControlButton from '$lib/components/PlayerControlButton.svelte';
	import { t } from '$lib/i18n/i18n';
	import {
		toggle as playerToggle,
		isReady as gIsReady,
		isPlaying as gIsPlaying,
		current as gCurrent,
		duration as gDuration,
		setQueue
	} from '$lib/player/player';

	onMount(() => {});

	$: isReady = $gIsReady;
	$: isPlaying = $gIsPlaying && $gCurrent?.src === src;
	$: localDuration = $gCurrent?.src === src ? $gDuration : 0;

	function fmtTime(totalSeconds: number) {
		const s = Math.max(0, Math.floor(totalSeconds || 0));
		const m = Math.floor(s / 60);
		const sec = s % 60;
		return `${m}:${sec.toString().padStart(2, '0')}`;
	}

	async function toggle() {
		if (!src) return;
		if ($gCurrent?.src !== src) {
			await setQueue([{ src, versionId: version_id, title, trackId, coverUrl }], 0, true);
		} else {
			playerToggle();
		}
	}
</script>

{#if src}
	<div class="track_footer">
		<div class="track_footer-actions">
			<PlayerControlButton
				on:click={toggle}
				disabled={!isReady && $gCurrent?.src === src}
				{isPlaying}
			/>
			<Reactions targetType="version" targetId={version_id} />
		</div>
	</div>
{:else}
	<slot name="empty">{$t('audio.no_audio')}</slot>
{/if}

<style lang="stylus">
.track_footer
  display flex
  flex-direction column
  gap .5rem

.track_footer-actions
  display flex
  align-self stretch
  justify-content space-between
  gap .75rem
  align-items center

</style>
