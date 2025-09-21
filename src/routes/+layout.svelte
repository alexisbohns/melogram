<script lang="ts">
    import '../global.styl';
	import favicon from '$lib/assets/favicon.svg';
    import GlobalPlayer from '$lib/components/GlobalPlayer.svelte'

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
    <!-- Google Fonts: moved from CSS @import to prevent import errors -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Doto:wght@100..900&family=Seaweed+Script&family=Sora:wght@100..800&family=Tiny5&display=swap" rel="stylesheet">
</svelte:head>

<main>
    {@render children?.()}
    <GlobalPlayer />
</main>

<style lang="stylus">
    main
        display flex
        flex-direction column
        padding 1rem 1rem 10rem 1rem
        max-width 600px
        margin 0 auto
</style>

