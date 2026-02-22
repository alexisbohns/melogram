<script lang="ts">
	import type { ThreadWithComments } from '$lib/types/threads';
	import { t } from '$lib/i18n/i18n';
	import { postReply } from '$lib/stores/threads';

	export let thread: ThreadWithComments;
	export let entityType: string;
	export let entityId: string;

	const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

	let showReplies = false;
	let replyBody = '';
	let submitting = false;

	$: rootComment = thread.comments.length > 0 ? thread.comments[0] : null;
	$: replies = thread.comments.slice(1);
	$: replyCount = thread.comment_count > 0 ? thread.comment_count - 1 : 0;

	async function handleReply() {
		if (!replyBody.trim() || submitting) return;
		submitting = true;
		await postReply(thread.id, replyBody.trim(), entityType, entityId);
		replyBody = '';
		submitting = false;
	}
</script>

<li class="thread-item">
	<div class="thread-header">
		<span class="thread-kind">{$t(`threads.kind_${thread.kind}`)}</span>
		<span class="thread-date">{formatDate(thread.created_at)}</span>
	</div>

	{#if rootComment}
		<p class="thread-body">{rootComment.body}</p>
	{/if}

	<div class="thread-meta">
		{#if replyCount > 0}
			<button class="toggle-replies" on:click={() => (showReplies = !showReplies)}>
				{replyCount === 1
					? $t('threads.replies_count_one')
					: $t('threads.replies_count', { count: replyCount })}
			</button>
		{:else}
			<span class="no-replies">{$t('threads.replies_count_zero')}</span>
		{/if}
	</div>

	{#if showReplies && replies.length > 0}
		<ul class="replies">
			{#each replies as reply (reply.id)}
				<li class="reply-item">
					<p class="reply-body">{reply.body}</p>
					<span class="reply-date">{formatDate(reply.created_at)}</span>
				</li>
			{/each}
		</ul>
	{/if}

	<form class="reply-form" on:submit|preventDefault={handleReply}>
		<input
			type="text"
			bind:value={replyBody}
			placeholder={$t('threads.reply_placeholder')}
			disabled={submitting}
		/>
		<button type="submit" disabled={!replyBody.trim() || submitting}>
			{$t('threads.submit_reply')}
		</button>
	</form>
</li>

<style lang="stylus">
.thread-item
  display flex
  flex-direction column
  gap 0.5rem
  padding 0.75rem
  border 1px solid rgba(255,255,255,0.08)
  border-radius 6px

.thread-header
  display flex
  align-items center
  gap 0.5rem
  font-size 0.8rem

.thread-kind
  text-transform uppercase
  font-weight 600
  opacity 0.6
  font-size 0.7rem

.thread-date
  opacity 0.4
  font-size 0.75rem

.thread-body
  margin 0
  font-size 0.9rem
  line-height 1.5

.thread-meta
  display flex
  gap 0.5rem
  align-items center

.toggle-replies
  background none
  border none
  color var(--tertiary)
  cursor pointer
  font-size 0.8rem
  padding 0
  opacity 0.6
  &:hover
    opacity 1

.no-replies
  opacity 0.4
  font-size 0.8rem

.replies
  list-style none
  padding 0
  margin 0
  padding-left 1rem
  border-left 2px solid rgba(255,255,255,0.08)
  display flex
  flex-direction column
  gap 0.5rem

.reply-item
  display flex
  flex-direction column
  gap 0.25rem

.reply-body
  margin 0
  font-size 0.85rem
  opacity 0.9

.reply-date
  opacity 0.4
  font-size 0.7rem

.reply-form
  display flex
  gap 0.5rem
  align-items center

  input
    flex 1
    background rgba(255,255,255,0.05)
    border 1px solid rgba(255,255,255,0.12)
    border-radius 4px
    padding 0.4rem 0.6rem
    color inherit
    font-size 0.85rem
    &::placeholder
      opacity 0.4
    &:disabled
      opacity 0.5

  button
    background none
    border 1px solid rgba(255,255,255,0.2)
    color var(--tertiary)
    padding 0.4rem 0.75rem
    border-radius 4px
    cursor pointer
    font-size 0.8rem
    white-space nowrap
    &:hover
      border-color rgba(255,255,255,0.4)
    &:disabled
      opacity 0.4
      cursor not-allowed
</style>
