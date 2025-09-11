<script lang="ts">
  import Fa from 'svelte-fa'
  import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

  export let icon: IconDefinition
  export let label: string | undefined
  export let size: string | number = 16
  export let className = ''

  let faSize: any
  let styleAttr: string = ''
  $: faSize = typeof size === 'string' ? size : undefined
  $: styleAttr = typeof size === 'number' ? `width:${size}px;height:${size}px;` : ''
</script>

<Fa {icon} size={faSize} class={className} title={label} style={styleAttr} />
