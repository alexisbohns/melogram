<script lang="ts">
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import { t } from '$lib/i18n/i18n';

	let { data } = $props();
	const user = $derived(data?.user ?? null);
	const displayName = $derived(
		user?.user_metadata?.full_name ??
			user?.user_metadata?.name ??
			user?.email ??
			$t('auth.anonymous')
	);
	const email = $derived(user?.email ?? '');
</script>

<svelte:head>
	<title>{$t('auth.profile')}</title>
</svelte:head>

<section class="profile">
	<div class="profile-card">
		{#if user}
			<UserAvatar {user} size={72} className="profile-avatar" />
		{/if}
		<h1>{$t('auth.profile_title')}</h1>
		<div class="profile-field">
			<span class="label">{$t('auth.profile_name')}</span>
			<span class="value">{displayName}</span>
		</div>
		<div class="profile-field">
			<span class="label">{$t('auth.profile_email')}</span>
			<span class="value">{email}</span>
		</div>
		<a class="signout" href="/auth/signout">{$t('auth.sign_out')}</a>
	</div>
</section>

<style lang="stylus">
.profile
  display flex
  align-items center
  justify-content center
  padding 3rem 1rem

.profile-card
  width min(420px, 100%)
  display flex
  flex-direction column
  align-items center
  gap 1.25rem
  padding 2rem
  border-radius 1rem
  background rgba(255,255,255,0.04)
  border 1px solid rgba(255,255,255,0.12)
  backdrop-filter blur(6px)

.profile-card h1
  margin 0
  font-size 1.35rem
  letter-spacing 0.04em
  text-transform uppercase

.profile-field
  width 100%
  display flex
  flex-direction column
  gap 0.35rem

.label
  font-size 0.75rem
  letter-spacing 0.16em
  text-transform uppercase
  opacity 0.6

.value
  font-size 1rem
  letter-spacing 0.02em

.signout
  margin-top 0.5rem
  display inline-flex
  align-items center
  justify-content center
  padding 0.7rem 1.4rem
  border-radius 999px
  border 1px solid rgba(255,255,255,0.35)
  text-decoration none
  color inherit
  text-transform uppercase
  font-size 0.8rem
  letter-spacing 0.12em
  transition transform 0.2s ease-out, background 0.2s ease-out

  &:hover
    background rgba(255,255,255,0.08)
    transform translateY(1px)
</style>
