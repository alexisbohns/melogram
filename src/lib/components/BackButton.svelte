<script lang="ts">
  export let href: string | null = null
  export let label = '← Retour'
  function go() {
    if (href) window.location.href = href
    else history.back()
  }
</script>

<button
  class="hover:text-black/50 cursor-pointer"
  on:click|preventDefault={go}
>
  {label}
</button>