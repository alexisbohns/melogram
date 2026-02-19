<script lang="ts">
	import type { ThreadKind } from '$lib/types/threads';
	import { t } from '$lib/i18n/i18n';
	import { createThread } from '$lib/stores/threads';

	export let entityType: string;
	export let entityId: string;
	export let user: any;

	let body = '';
	let kind: ThreadKind = 'comment';
	let submitting = false;
	let error: string | null = null;

	async function handleSubmit() {
		if (!body.trim() || submitting) return;
		submitting = true;
		error = null;

		const result = await createThread(entityType, entityId, kind, body.trim());
		if (!result) {
			error = $t('threads.error_create');
		} else {
			body = '';
			kind = 'comment';
		}
		submitting = false;
	}
</script>

{#if user}
	<form class="thread-form" on:submit|preventDefault={handleSubmit}>
		<div class="form-row">
			<textarea
				bind:value={body}
				placeholder={$t('threads.body_placeholder')}
				rows="3"
				disabled={submitting}
			></textarea>
		</div>

		<div class="form-footer">
			<div class="kind-toggle">
				<label class:active={kind === 'comment'}>
					<input type="radio" bind:group={kind} value="comment" />
					{$t('threads.kind_comment')}
				</label>
				<label class:active={kind === 'question'}>
					<input type="radio" bind:group={kind} value="question" />
					{$t('threads.kind_question')}
				</label>
			</div>
			<button type="submit" disabled={!body.trim() || submitting}>
				{$t('threads.submit')}
			</button>
		</div>

		{#if error}
			<p class="error">{error}</p>
		{/if}
	</form>
{:else}
	<p class="sign-in-hint">{$t('threads.sign_in_to_comment')}</p>
{/if}

<style lang="stylus">
.thread-form
  display flex
  flex-direction column
  gap 0.5rem

  textarea
    width 100%
    background rgba(255,255,255,0.05)
    border 1px solid rgba(255,255,255,0.12)
    border-radius 4px
    padding 0.5rem 0.75rem
    color inherit
    font-size 0.9rem
    resize vertical
    font-family inherit
    &::placeholder
      opacity 0.4
    &:disabled
      opacity 0.5

.form-row
  display flex

.form-footer
  display flex
  align-items center
  justify-content space-between
  gap 0.5rem

  button
    background none
    border 1px solid rgba(255,255,255,0.25)
    color var(--tertiary)
    padding 0.4rem 1rem
    border-radius 4px
    cursor pointer
    font-size 0.85rem
    &:hover
      border-color rgba(255,255,255,0.5)
    &:disabled
      opacity 0.4
      cursor not-allowed

.kind-toggle
  display flex
  gap 0.5rem

  label
    display flex
    align-items center
    gap 0.25rem
    font-size 0.8rem
    opacity 0.5
    cursor pointer
    &.active
      opacity 1

  input[type="radio"]
    accent-color var(--tertiary)

.error
  color #dc2626
  font-size 0.85rem
  margin 0

.sign-in-hint
  opacity 0.5
  font-size 0.9rem
</style>
