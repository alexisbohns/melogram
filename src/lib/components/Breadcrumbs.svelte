<script lang="ts">
	type Crumb = { label: string; href?: string };

	export let items: Crumb[] = [];
	export let ariaLabel = 'Breadcrumb';
</script>

<nav class="breadcrumbs" aria-label={ariaLabel}>
	{#each items as item, index (item.label + index)}
		{#if item.href && index < items.length - 1}
			<a href={item.href}>{item.label}</a>
		{:else}
			<span class="current">{item.label}</span>
		{/if}
		{#if index < items.length - 1}
			<span class="breadcrumbs-sep">›</span>
		{/if}
	{/each}
</nav>

<style lang="stylus">
.breadcrumbs
  display flex
  align-items center
  gap 0.35rem
  font-size 0.9rem
  color var(--tertiary)
  opacity 0.75

  a
    color inherit
    text-decoration none

  .current
    color inherit

.breadcrumbs-sep
  opacity 0.6
</style>
