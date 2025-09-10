<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
    <!-- Google Fonts: moved from CSS @import to prevent import errors -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Doto:wght@100..900&family=Seaweed+Script&family=Sora:wght@100..800&family=Tiny5&display=swap" rel="stylesheet">
</svelte:head>

{@render children?.()}
