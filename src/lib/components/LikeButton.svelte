<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { icons } from '$lib/icons';
	import { t } from '$lib/i18n/i18n';

	export let trackId: string;
	export let likeCount: number = 0;
	export let likedByMe: boolean = false;

	const dispatch = createEventDispatcher<{
		change: { liked_by_me: boolean; like_count: number };
	}>();

	let loading = false;

	async function toggle() {
		if (loading) return;
		loading = true;

		const wasLiked = likedByMe;
		const prevCount = likeCount;

		// Optimistic update
		likedByMe = !wasLiked;
		likeCount = wasLiked ? Math.max(0, likeCount - 1) : likeCount + 1;

		try {
			const method = wasLiked ? 'DELETE' : 'POST';
			const res = await fetch(`/api/tracks/${trackId}/like`, { method });

			if (!res.ok) {
				// Rollback
				likedByMe = wasLiked;
				likeCount = prevCount;
			} else {
				dispatch('change', { liked_by_me: likedByMe, like_count: likeCount });
			}
		} catch {
			// Rollback
			likedByMe = wasLiked;
			likeCount = prevCount;
		} finally {
			loading = false;
		}
	}
</script>

<button
	type="button"
	class="like-button"
	class:liked={likedByMe}
	on:click={toggle}
	disabled={loading}
	aria-label={likedByMe ? $t('common.unlike') : $t('common.like')}
	aria-pressed={likedByMe}
>
	<Icon
		icon={likedByMe ? icons.heart : icons.heartRegular}
		size={16}
		label={likedByMe ? $t('common.unlike') : $t('common.like')}
	/>
	<span class="like-count">{likeCount}</span>
</button>

<style lang="stylus">
.like-button
	display flex
	align-items center
	gap 0.4rem
	cursor pointer
	opacity 0.5
	mix-blend-mode plus-lighter
	color var(--tertiary)
	transition all ease-out 0.15s

	&:hover
		opacity 0.7
		color var(--primary)
		transform scale(110%)

	&:active
		transform scale(90%)

	&.liked
		opacity 0.9
		color var(--primary)
		mix-blend-mode unset

	&:disabled
		cursor default

	.like-count
		font-family var(--font-captions)
		opacity 0.7
</style>
