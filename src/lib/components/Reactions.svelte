<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { supabase } from '$lib/supabaseClient'
  import Icon from '$lib/components/Icon.svelte'
  import { icons } from '$lib/icons'
  import { t } from '$lib/i18n/i18n'

  export let targetType: 'track' | 'version'
  export let targetId: string

  let counts = { love: 0, thumbs_up: 0, neutral: 0 }
  let clicked = { love: false, thumbs_up: false, neutral: false }
  let fingerprint: string
  let polling: any
  let destroyed = false


  onMount(async () => {
    const fp = await getFingerprint()
    if (destroyed) return
    fingerprint = fp
    await loadReactions()
    if (destroyed) return
    polling = setInterval(loadReactions, 5000)
  })

  onDestroy(() => {
    destroyed = true
    if (polling) clearInterval(polling)
  })

  async function getFingerprint() {
    const ua = navigator.userAgent
    let fp = localStorage.getItem('fingerprint')
    if (!fp) {
      fp = btoa(ua + Math.random().toString(36).slice(2))
      localStorage.setItem('fingerprint', fp)
    }
    return fp
  }

  async function loadReactions() {
    const { data } = await supabase
      .from('reactions')
      .select('love, thumbs_up, neutral')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .single()

    if (destroyed) return
    if (data) counts = data
  }

  async function vote(criterion: 'love' | 'thumbs_up' | 'neutral') {
    const since = new Date(Date.now() - 60 * 1000).toISOString()
    const { count } = await supabase
      .from('reaction_clicks')
      .select('*', { count: 'exact', head: true })
      .eq('fingerprint', fingerprint)
      .gte('created_at', since)

    if ((count ?? 0) >= 20) {
      alert('Trop de clics, réessaie dans une minute ✋')
      return
    }

    const { error: rpcErr } = await supabase.rpc('increment_reaction', {
      r_target_id: targetId,
      r_column: criterion
    })
    if (rpcErr) {
      console.error('RPC error:', rpcErr)
    }

    const { error: clickErr } = await supabase.from('reaction_clicks').insert({
      target_type: targetType,
      target_id: targetId,
      criterion,
      fingerprint
    })
    if (clickErr) {
      console.error('Click insert error:', clickErr)
    }

    counts[criterion]++
    clicked[criterion] = true
  }
</script>

<div class="reactions">
  <button on:click={() => vote('love')} class="reactions-item">
    <Icon icon={clicked.love ? icons.heart : icons.heartRegular} size={18} label={$t('common.love')} />
    <span class="reactions-item-label">{counts.love}</span>
  </button>
  <button on:click={() => vote('thumbs_up')} class="reactions-item">
    <Icon icon={clicked.thumbs_up ? icons.thumbsUp : icons.thumbsUpRegular} size={18} label={$t('common.love')} />
    <span class="reactions-item-label">{counts.thumbs_up}</span>
  </button>
  <button on:click={() => vote('neutral')} class="reactions-item">
    <Icon icon={clicked.neutral ? icons.squareMinus : icons.squareMinusRegular} size={18} label={$t('common.neutral')} />
    <span class="reactions-item-label">{counts.neutral}</span>
  </button>
</div>
<style lang="stylus">
  .reactions
    display flex
    align-items center
    gap 1rem
    
    &-item
      display flex
      align-items center
      gap 0.5rem

      &-label
        opacity 0.5
</style>