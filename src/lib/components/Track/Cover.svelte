<script lang="ts">
	export let cover_url: string | null = null;
	export let alt = '';
	export let display: 'none' | 'default' | 'large' = 'default';

	const sizeMap: Record<'default' | 'large', string> = {
		default: '2.5rem',
		large: '4.5rem'
	};

	$: visible = display !== 'none';
	$: size = display === 'large' ? sizeMap.large : sizeMap.default;
	$: hasCover = visible && Boolean(cover_url);
</script>

{#if visible}
	<div
		class={`track-cover track-cover-${display}${hasCover ? '' : ' track-cover-placeholder'}`}
		style={`--cover-size:${size};`}
	>
		{#if hasCover}
			<img src={cover_url!} {alt} loading="lazy" />
		{:else}
			<div class="track-cover-fallback" aria-hidden="true"></div>
		{/if}
	</div>
{/if}

<style lang="stylus">
.track-cover
  width var(--cover-size)
  height var(--cover-size)
  border-radius .25rem
  overflow hidden
  background rgba(255,255,255,0.04)
  display flex
  align-items center
  justify-content center
  flex-shrink 0
  box-shadow 0 10px 30px rgba(0,0,0,0.2)

  img
    width 100%
    height 100%
    object-fit cover
    display block

  &-placeholder
    border-style dashed

  &-fallback
    width 100%
    height 100%
    background linear-gradient(135deg, rgba(103,71,113,.25), rgba(191,167,200,.15))
    opacity 0.6
</style>
