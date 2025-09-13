import type { PageServerLoad } from './$types'
import { supabase } from '$lib/supabaseClient'

export const load: PageServerLoad = async () => {
  // Minimal : liste des tracks
  const { data, error } = await supabase
    .from('tracks')
    .select('id, slug, name, cover_url, created_at')
    .order('created_at', { ascending: false })

  return { tracks: data ?? [], error: error?.message ?? null }
}