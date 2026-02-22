<script lang="ts">
	import TrackVersionItem from '$lib/components/TrackVersionItem.svelte';
	import type { Version } from '$lib/components/TrackVersionItem.svelte';
	import ThreadItem from '$lib/components/ThreadItem.svelte';
	import ThreadForm from '$lib/components/ThreadForm.svelte';
	import { t } from '$lib/i18n/i18n';
	import {
		threads,
		threadsLoading,
		threadsError,
		threadsCursor,
		fetchThreads
	} from '$lib/stores/threads';
	import { onMount } from 'svelte';
	import type { User } from '@supabase/supabase-js';

	type Track = {
		id: string;
		name: string;
		description?: string | null;
		cover_url?: string | null;
	};

	export let track: Track;
	export let versions: Version[] = [];
	export let user: User | null = null;
	export let canAnswer: boolean = false;

	type ActivityItem =
		| { type: 'version'; date: string; version: Version }
		| { type: 'thread'; date: string; thread: any };

	onMount(() => {
		fetchThreads('track', track.id, true);
	});

	$: activityItems = buildTimeline(versions, $threads);

	function buildTimeline(vers: Version[], thrs: any[]): ActivityItem[] {
		const items: ActivityItem[] = [];

		for (const v of vers) {
			items.push({
				type: 'version',
				date: v.release_date,
				version: v
			});
		}

		for (const th of thrs) {
			items.push({
				type: 'thread',
				date: th.last_activity_at ?? th.created_at,
				thread: th
			});
		}

		items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

		return items;
	}
</script>

<section class="track-activity">
	<ThreadForm entityType="track" entityId={track.id} {user} />

	{#if $threadsError}
		<p class="error">{$t('threads.error_load')}</p>
	{/if}

	{#if activityItems.length === 0 && !$threadsLoading}
		<p class="empty">{$t('tracks.no_versions')}</p>
	{/if}

	<ul class="activity-list">
		{#each activityItems as item (item.type === 'version' ? `v-${item.version.id}` : `t-${item.thread.id}`)}
			{#if item.type === 'version'}
				<TrackVersionItem
					version={item.version}
					trackTitle={track.name}
					trackId={track.id}
					trackDescription={track.description}
					trackCoverUrl={track.cover_url}
					descriptionMode="version"
				/>
			{:else}
				<ThreadItem thread={item.thread} entityType="track" entityId={track.id} {canAnswer} />
			{/if}
		{/each}
	</ul>

	{#if $threadsCursor}
		<button
			class="load-more"
			disabled={$threadsLoading}
			on:click={() => fetchThreads('track', track.id)}
		>
			{#if $threadsLoading}…{:else}{$t('common.load_more') ?? 'Load more'}{/if}
		</button>
	{/if}
</section>

<style lang="stylus">
.track-activity
  display flex
  flex-direction column
  gap 1rem

.activity-list
  list-style none
  margin 0
  padding 0
  display flex
  flex-direction column
  gap .75rem

.empty
  opacity 0.5
  font-size 0.9rem

.error
  color #dc2626

.load-more
  background none
  border 1px solid rgba(255,255,255,0.2)
  color var(--tertiary)
  padding 0.5rem 1rem
  border-radius 4px
  cursor pointer
  font-size 0.85rem
  align-self center
  &:hover
    border-color rgba(255,255,255,0.4)
  &:disabled
    opacity 0.5
    cursor not-allowed
</style>
