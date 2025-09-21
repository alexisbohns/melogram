import type { PageServerLoad } from './$types'
import { supabase } from '$lib/supabaseClient'

export const load: PageServerLoad = async () => {
  // Liste des tracks triés par la date de sortie la plus récente d'une version
  const { data, error } = await supabase
    .from('tracks')
    .select(`
      id,
      slug,
      name,
      description,
      cover_url,
      created_at,
      track_versions(
        versions(id, name, resource_url, release_date, status)
      )
    `)

  if (error) {
    return { tracks: [], error: error.message }
  }

  // Calculer latest_release côté serveur
  const enriched = data.map((t: any) => {
    const releases = Array.isArray(t.track_versions)
      ? t.track_versions
          .map((tv: any) => tv?.versions?.release_date)
          .filter(Boolean)
          .map((d: string) => new Date(d).getTime())
      : []

    const latest = releases.length > 0 ? Math.max(...releases) : null

    return { ...t, latest_release: latest }
  })

  enriched.sort((a, b) => (b.latest_release ?? 0) - (a.latest_release ?? 0))

  return { tracks: enriched, error: null }
}
