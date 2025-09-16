<script lang="ts">
  import { t } from '$lib/i18n/i18n'

  type Track = { id: string; name: string; lyrics?: string | null }
  export let track: Track
</script>

<section>
  {#if track?.lyrics}
    <div class="lyrics">{track.lyrics}</div>
  {:else}
    <p>{$t('tracks.no_lyrics')}</p>
  {/if}
</section>

<style lang="stylus">
.lyrics
  white-space pre-wrap
  line-height 1.6
</style>

