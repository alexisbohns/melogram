<script lang="ts">
	import type { ThreadWithComments } from '$lib/types/threads';
	import { t } from '$lib/i18n/i18n';
	import ThreadItem from '$lib/components/ThreadItem.svelte';
	import {
		threads,
		threadsLoading,
		threadsError,
		threadsCursor,
		fetchThreads
	} from '$lib/stores/threads';

	export let entityType: string;
	export let entityId: string;

	import { onMount } from 'svelte';

	onMount(() => {
		fetchThreads(entityType, entityId, true);
	});
</script>

<div class="thread-list">
	{#if $threadsError}
		<p class="error">{$t('threads.error_load')}</p>
	{/if}

	{#if $threads.length === 0 && !$threadsLoading}
		<p class="empty">{$t('threads.no_threads')}</p>
	{/if}

	<ul class="threads">
		{#each $threads as thread (thread.id)}
			<ThreadItem {thread} {entityType} {entityId} />
		{/each}
	</ul>

	{#if $threadsCursor}
		<button
			class="load-more"
			disabled={$threadsLoading}
			on:click={() => fetchThreads(entityType, entityId)}
		>
			{#if $threadsLoading}…{:else}{$t('common.load_more') ?? 'Load more'}{/if}
		</button>
	{/if}
</div>

<style lang="stylus">
.thread-list
  display flex
  flex-direction column
  gap 1rem

.threads
  list-style none
  padding 0
  margin 0
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
