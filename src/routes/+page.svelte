<script lang="ts">
  export let data
  const { tracks, error } = data

  import { t } from '$lib/i18n/i18n'
  import Icon from '$lib/components/Icon.svelte'
  import { icons } from '$lib/icons'
  import WavePlayer from '$lib/components/WavePlayer.svelte'

  function latestVersion(track: any) {
    const list = Array.isArray(track?.track_versions)
      ? track.track_versions.map((tv: any) => tv?.versions).filter(Boolean)
      : []
    if (list.length === 0) return null
    return list.slice().sort((a: any, b: any) =>
      new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
    )[0]
  }

  $: withVersions = (tracks ?? []).filter((t: any) => t.latest_release !== null)
  $: withoutVersions = (tracks ?? []).filter((t: any) => t.latest_release === null)
</script>

<h1>Morceaux</h1>
{#if error}<p class="text-red-600">{error}</p>{/if}
{#if tracks.length === 0}
  <p>Aucun morceau.</p>
{:else}
  <section class="tracks-latests">
    <div class="tracks_list">
      {#each withVersions as track}
        <div class="track_item">
          <a href={`/tracks/${track.slug}`} class="track_item_link">
            <div class="track_item_name">{track.name}</div>
          </a>
          {#if latestVersion(track)?.resource_url}
          <div class="track_item_player">
            <WavePlayer src={latestVersion(track).resource_url} version_id={latestVersion(track).id} height={56} />
          </div>
          <div class="track_item_date">
            <Icon icon={icons.clockRotateLeft} size={12} label={$t('common.latest')} />
            <span>
              {track.latest_release ? new Date(track.latest_release).toLocaleDateString() : '—'}
            </span>
          </div>
          {/if}
        </div>
      {/each}
    </div>
  </section>
  {#if withoutVersions.length > 0}
    <section class="tracks-upcoming">
      <h2 style="margin-top: 2rem;">{$t('tracks.upcoming')}</h2>
      <div class="tracks_list">
        {#each withoutVersions as track}
          <div class="track_item">
            <div class="track_item_name">{track.name}</div>
            <div class="track_item_description">{track.description}</div>
          </div>
        {/each}
      </div>
    </section>
  {/if}
{/if}

<style lang="stylus">
  .tracks
    &-latests
      .track
        &_item
          display flex
          flex-direction column
          gap 0.5rem

          & a.track_item_link:hover
            opacity 0.5

          &_name
            font-family "Seaweed Script"
            font-size 2rem

          &_date
            display flex
            align-items center
            justify-content flex-end
            gap 0.125rem
            opacity 0.25
            font-size 0.6rem
            padding 0 1rem
      
    &-upcoming
      .track
        &_item
          display flex
          flex-direction column
          text-align left

          &_name
            opacity 0.6
            font-size: 0.8rem

          &_description
            opacity 0.3
            font-size 0.8rem
            font-weight 300
          
  .tracks_list
      display flex
      flex-direction column
      gap 1rem
      color white
      mix-blend-mode plus-lighter

</style>
