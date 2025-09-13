<script lang="ts">
  import Icon from '$lib/components/Icon.svelte'
  import { icons } from '$lib/icons'
  import { t } from '$lib/i18n/i18n'
  export let href: string | null = null
  export let label: string | null = null
  function go() {
    if (href) window.location.href = href
    else history.back()
  }
</script>

<button
  class="button-back"
  on:click|preventDefault={go}
  aria-label={label ?? $t('common.back')}
>
  <Icon icon={icons.arrowLeft} size={14} label={$t('common.back')}/>
  <span style="margin-left: .5rem">{label ?? $t('common.back')}</span>
  
</button>

<style lang="stylus">
  .button-back
    display inline-flex
    align-items center
    gap .125rem
    cursor pointer
    font-family var(--font-captions)
    opacity 0.5

    &:hover
      opacity 1
</style>
