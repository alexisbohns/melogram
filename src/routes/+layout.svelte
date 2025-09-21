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

<div class="bg-fixed"></div>

<style lang="stylus">
    main
        display flex
        flex-direction column
        padding 1rem 1rem 10rem 1rem
        max-width 600px
        margin 0 auto
    
    .bg-fixed
        position fixed
        top 0
        left 0
        right 0
        bottom 0
        background-image url('https://olixcgppvluthbgcjtkf.supabase.co/storage/v1/object/public/versions/test/hlag_bg.jpg')
        background-size cover
        background-position center
        z-index -1
</style>

