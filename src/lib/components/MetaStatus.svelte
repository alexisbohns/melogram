<script lang="ts">
	export let statusText: string | null = null;
	export let statusVariant: string | null = null;
</script>

{#if statusText}
	<span class={`track_item_status${statusVariant ? ` track_item_status_${statusVariant}` : ''}`}>
		{statusText}
	</span>
{/if}

<style lang="stylus">
.track_item_status
  font-family var(--font-captions)
  text-transform uppercase
  font-size 0.6rem
  letter-spacing 0.05em
  padding 0.15rem 0.5rem
  border-radius 9999px
  background var(--primary)
  color var(--tertiary)

  &.track_item_status_draft
    background rgba(tomato,0.2)
    color rgba(tomato, 0.5)

  &.track_item_status_prototype
    background rgba(khaki,0.2)
    color rgba(khaki,0.5)

  &.track_item_status_demo
    background rgba(darkseagreen,0.2)
    color rgba(darkseagreen,0.6)
</style>
