<script lang="ts">
	export let data;
	const { tracks, error } = data;

	import { t } from '$lib/i18n/i18n';
	import { icons } from '$lib/icons';
	import TrackVersionFooter from '$lib/components/TrackVersionFooter.svelte';
	import TrackItemHeader from '$lib/components/TrackItemHeader.svelte';

	function latestVersion(track: any) {
		const list = Array.isArray(track?.track_versions)
			? track.track_versions.map((tv: any) => tv?.versions).filter(Boolean)
			: [];
		if (list.length === 0) return null;
		return list
			.slice()
			.sort(
				(a: any, b: any) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
			)[0];
	}

	$: withVersions = (tracks ?? []).filter((t: any) => t.latest_release !== null);
	$: withoutVersions = (tracks ?? []).filter((t: any) => t.latest_release === null);
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
					<a href={`/tracks/${track.id}`} class="track_item_link">
						<TrackItemHeader
							title={track.name}
							dateValue={track.latest_release
								? new Date(track.latest_release).toLocaleDateString()
								: '—'}
							icon={icons.clockRotateLeft}
							statusVariant={version?.status ?? null}
							statusText={version?.status ? $t(`tracks.status.${version.status}`) : null}
						/>
						<div class="track_item_description">{track.description}</div>
					</a>
					{#if version?.resource_url}
						<div class="track_item_player">
							<TrackVersionFooter
								src={version.resource_url}
								version_id={version.id}
								title={track.name}
								trackId={track.id}
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

          & a.track_item_link
            transition all ease-out 0.25s
            display flex
            flex-direction column
            gap .5rem

            &:hover
              opacity 0.5

          &_description
            opacity 0.4
            font-size 0.8rem
            font-weight 300   
            line-height 150%         

          &_player
            border-top 1px solid rgba(255,255,255,0.05)
            padding .5rem 0
      
    &-upcoming
      .track
        &_item
          display flex
          flex-direction column
          gap .25rem
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
