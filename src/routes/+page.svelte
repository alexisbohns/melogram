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
{#if error}<p class="error">{error}</p>{/if}
{#if tracks.length === 0}
  <p>Aucun morceau.</p>
{:else}
  <section class="tracks-latests">
    <h2 style="margin-top: 2rem;">{$t('tracks.latests')}</h2>
    <div class="tracks_list">
      {#each withVersions as track}
        {@const version = latestVersion(track)}
        <div class="track_item">
          <a href={`/tracks/${track.slug}`} class="track_item_link">
            <div class="track_item_header">
              <div class="track_item_name">{track.name}</div>
              <div class="track_item_meta">
                <div class="track_item_date">
                  <Icon icon={icons.clockRotateLeft} size={12} label={$t('common.latest')} />
                  <span>
                    {track.latest_release ? new Date(track.latest_release).toLocaleDateString() : '—'}
                  </span>
                </div>
                {#if version?.status}
                  <span class={`track_item_status track_item_status_${version.status}`}>
                    {$t(`tracks.status.${version.status}`)}
                  </span>
                {/if}
              </div>
            </div>
            <div class="track_item_description">{track.description}</div>
          </a>
          {#if version?.resource_url}
          <div class="track_item_player">
            <WavePlayer
              src={version.resource_url}
              version_id={version.id}
              title={track.name}
              track_slug={track.slug}
              coverUrl={track.cover_url}
            />
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
  h1, h2
    font-family var(--font-captions)
    text-align center
    color rgba(255,255,255,0.6)

  h1
    font-size 1rem
    margin-bottom 2rem

  h2
    font-size 1.5rem
    margin 2rem 0
  .tracks
    &-latests
      .track
        &_item
          display flex
          flex-direction column
          gap 0.5rem

          & a.track_item_link:hover
            opacity 0.5

          &_header
            display flex
            justify-content space-between
            align-items center

          &_name
            font-family var(--font-captions)
            font-size 1rem
            color rgba(255,255,255,0.7)

          &_meta
            display flex
            align-items center
            gap 0.25rem

          &_status
            font-family var(--font-captions)
            text-transform uppercase
            font-size 0.6rem
            letter-spacing 0.05em
            padding 0.15rem 0.5rem
            border-radius 9999px
            background rgba(255,255,255,0.08)
            color rgba(255,255,255,0.7)

            &_draft
              background rgba(tomato,0.2)
              color rgba(tomato, 0.5)

            &_prototype
              background rgba(khaki,0.2)
              color rgba(khaki,0.5)

            &_demo
              background rgba(darkseagreen,0.2)
              color rgba(darkseagreen,0.6)

          &_description
            opacity 0.3
            font-size 0.8rem
            font-weight 300            

          &_date
            font-family var(--font-captions)
            display flex
            align-items center
            justify-content flex-end
            gap 0.125rem
            opacity 0.3
            font-size 0.8rem
          
          &_player
            border-top 1px solid rgba(255,255,255,0.1)
            // border-bottom 1px solid rgba(255,255,255,0.1)
            padding 0.5rem 0
      
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
      gap 3rem

  .error
    color #dc2626

</style>
