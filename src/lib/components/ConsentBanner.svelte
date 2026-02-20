<script lang="ts">
	import { onMount } from 'svelte';
	import { analyticsConsent, grantConsent, denyConsent } from '$lib/consent';
	import { t } from '$lib/i18n/i18n';

	// Only show after client hydration to avoid an SSR flash when consent
	// was already given in a previous session.
	let mounted = false;
	onMount(() => {
		mounted = true;
	});

	$: show = mounted && $analyticsConsent === null;
</script>

{#if show}
	<div
		class="consent-banner"
		role="region"
		aria-live="polite"
		aria-label={$t('consent.banner_label')}
	>
		<p class="consent-text">{$t('consent.banner_text')}</p>
		<div class="consent-actions">
			<button type="button" class="btn-deny" on:click={denyConsent}>{$t('consent.decline')}</button>
			<button type="button" class="btn-accept" on:click={grantConsent}
				>{$t('consent.accept')}</button
			>
		</div>
	</div>
{/if}

<style lang="stylus">
.consent-banner
  position fixed
  bottom 0
  left 0
  right 0
  z-index 200
  display flex
  flex-direction column
  gap .75rem
  // Offset above the global audio player (~90px) so they don't overlap on mobile.
  padding 1rem 1.25rem 6rem
  background rgba(20, 13, 24, 0.95)
  backdrop-filter blur(12px)
  border-top 1px solid rgba(255,255,255,0.08)
  max-width 700px
  margin 0 auto

  @media screen and (min-width: 768px)
    flex-direction row
    align-items center
    justify-content space-between
    // On desktop the player sits at the bottom edge; normal padding is fine.
    padding 1rem 1.25rem

.consent-text
  font-size 0.85rem
  line-height 1.5
  opacity 0.85
  flex 1

.consent-actions
  display flex
  gap .5rem
  flex-shrink 0

.btn-accept, .btn-deny
  padding .45rem 1rem
  border-radius .375rem
  font-family var(--font-captions)
  font-size .8rem
  letter-spacing .05em
  cursor pointer
  transition background 0.15s ease-out, transform 0.15s ease-out
  border none

  &:hover
    transform translateY(1px)

  &:active
    transform translateY(2px)

.btn-accept
  background var(--primary)
  color var(--default)

  &:hover
    background var(--secondary)

.btn-deny
  background transparent
  color var(--tertiary)
  border 1px solid rgba(255,255,255,0.15)

  &:hover
    background rgba(255,255,255,0.06)
</style>
