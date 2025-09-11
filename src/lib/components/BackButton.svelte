<script lang="ts">
  import Icon from '$lib/components/Icon.svelte'
  import { icons } from '$lib/icons'
  export let href: string | null = null
  export let label = 'Retour'
  function go() {
    if (href) window.location.href = href
    else history.back()
  }
</script>

<button
  class="hover:text-black/50 cursor-pointer"
  on:click|preventDefault={go}
  aria-label={label}
>
  <Icon icon={icons.arrowLeft} size={14} />
  <span style="margin-left: .5rem">{label}</span>
</button>
