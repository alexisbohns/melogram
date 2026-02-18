<script lang="ts">
	import type { User } from '@supabase/supabase-js';
	import { t } from '$lib/i18n/i18n';

	let {
		user,
		size = 36,
		className = ''
	} = $props<{
		user: User | null;
		size?: number;
		className?: string;
	}>();

	const avatarUrl = $derived(
		user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null
	);
	const displayName = $derived(
		user?.user_metadata?.full_name ??
			user?.user_metadata?.name ??
			user?.email ??
			$t('auth.anonymous')
	);
	const fallbackLetter = $derived(
		displayName && displayName.trim().length > 0 ? displayName.trim().charAt(0).toUpperCase() : '?'
	);
	const label = $derived(displayName || $t('auth.anonymous'));
	const styleAttr = $derived(`--size:${size}px;`);
</script>

<span class={`user-avatar ${className}`} style={styleAttr} aria-label={label} role="img">
	{#if avatarUrl}
		<img src={avatarUrl} alt={label} loading="lazy" referrerpolicy="no-referrer" />
	{:else}
		<span class="fallback">{fallbackLetter}</span>
	{/if}
</span>

<style lang="stylus">
.user-avatar
  display inline-flex
  align-items center
  justify-content center
  width var(--size)
  height var(--size)
  border-radius 999px
  overflow hidden
  border 1px solid rgba(255,255,255,0.25)
  background rgba(255,255,255,0.08)
  color var(--tertiary)
  font-family var(--font-captions)
  font-size calc(var(--size) * 0.45)
  text-transform uppercase

.user-avatar img
  display block
  width 100%
  height 100%
  object-fit cover

.fallback
  line-height 1
</style>
