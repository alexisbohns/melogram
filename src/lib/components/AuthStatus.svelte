<script lang="ts">
	import type { User } from '@supabase/supabase-js';
	import Icon from '$lib/components/Icon.svelte';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import { icons } from '$lib/icons';
	import { t } from '$lib/i18n/i18n';

	let { user } = $props<{ user: User | null }>();
</script>

{#if user}
	<a class="auth-link" href="/profile" aria-label={$t('auth.profile')}>
		<UserAvatar {user} size={32} />
	</a>
{:else}
	<a class="auth-link" href="/auth/login" aria-label={$t('auth.sign_in')}>
		<Icon icon={icons.userCircle} label={$t('auth.sign_in')} size={22} />
	</a>
{/if}

<style lang="stylus">
.auth-link
  display inline-flex
  align-items center
  justify-content center
  text-decoration none
  color inherit
  border-radius 999px
  padding 0.25rem
  transition transform 0.2s ease-out, background 0.2s ease-out

  &:hover
    background rgba(255,255,255,0.08)
    transform translateY(1px)

</style>
