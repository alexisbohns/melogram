<script lang="ts">
  export let href: string | null = null
  export let label = 'Retour'
  function go() {
    if (href) window.location.href = href
    else history.back()
  }
</script>

<button
  class="button-back"
  on:click|preventDefault={go}
  aria-label={label}
>
  {label}
</button>

<style lang="stylus">
  .button-back
    cursor pointer
    font-family var(--font-captions)
    opacity 0.5

    &:hover
      opacity 1
</style>
