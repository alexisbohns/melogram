import type { PageServerLoad } from './$types'
import { supabase } from '$lib/supabaseClient'

export const load: PageServerLoad = async ({ params }) => {
  const { slug } = params

  // 1) Fetch the track by slug
  const { data: track, error: trackErr } = await supabase
    .from('tracks')
    .select('id, slug, name, description, cover_url, created_at, lyrics')
    .eq('slug', slug)
    .single()

  if (trackErr || !track) {
    return { track: null, versions: [], error: trackErr?.message ?? 'Track not found' }
  }

  // 2) Get version ids linked to this track via join table (no FK embedding required)
  const { data: links, error: linksErr } = await supabase
    .from('track_versions')
    .select('version_id')
    .eq('track_id', track.id)

  if (linksErr) {
    return { track, versions: [], error: linksErr.message }
  }

  const versionIds = (links ?? []).map(l => l.version_id).filter(Boolean)

  if (versionIds.length === 0) {
    return { track, versions: [], error: null }
  }

  // 3) Fetch the versions themselves, ordered by release_date desc
  const { data: versions, error: verErr } = await supabase
    .from('versions')
    .select('id, name, resource_url, release_date, description')
    .in('id', versionIds)
    .order('release_date', { ascending: false })

  return { track, versions: versions ?? [], error: verErr?.message ?? null }
}
