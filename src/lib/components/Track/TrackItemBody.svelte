<script lang="ts">
	export let description: string | null = null;
	export let display = false;

	$: showDescription = display && Boolean(description?.trim());
</script>

{#if showDescription}
	<div class="track-body">{description}</div>
{/if}

<style lang="stylus">
.track-body
  font-size 0.95rem
  line-height 1.6
  color var(--default)
  opacity 0.9
  padding-right 0.5rem
</style>
