<script lang="ts" context="module">
  // Export type for external consumers
  export type TabItem = { id: string; label: string }
</script>

<script lang="ts">
  // Local type for internal props typing
  type TabItem = { id: string; label: string }
  export let items: TabItem[] = []
  export let value: string
  export let ariaLabel = 'Tabs'

  let buttons: HTMLButtonElement[] = []
  $: activeIndex = items.findIndex((t) => t.id === value)

  function select(id: string) {
    value = id // rely on bind:value for parent updates
  }

  function onKeydown(e: KeyboardEvent) {
    if (!items.length) return
    const idx = items.findIndex((t) => t.id === value)
    if (idx < 0) return
    let next = idx
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (idx - 1 + items.length) % items.length
        break
      case 'ArrowRight':
      case 'ArrowDown':
        next = (idx + 1) % items.length
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = items.length - 1
        break
      default:
        return
    }
    e.preventDefault()
    const id = items[next].id
    select(id)
    // move focus to new active tab
    buttons[next]?.focus()
  }
  function onFocus() {
    // When the tablist itself receives focus, move focus to the active tab
    if (activeIndex >= 0) buttons[activeIndex]?.focus()
  }
</script>

<div
  class="tabs"
  role="tablist"
  aria-label={ariaLabel}
  tabindex="0"
  on:keydown={onKeydown}
  on:focus={onFocus}
>
  {#each items as t, i}
    <button
      bind:this={buttons[i]}
      role="tab"
      class:active={value === t.id}
      aria-selected={value === t.id}
      tabindex={value === t.id ? 0 : -1}
      on:click={() => select(t.id)}
    >{t.label}</button>
  {/each}
</div>

<style lang="stylus">
.tabs
  display flex
  gap 2rem
  justify-content center
  margin 1rem 0
  font-family var(--font-captions)

.tabs > button
  appearance none
  background transparent
  border none
  padding .5rem 1rem
  cursor pointer
  opacity 0.5

  display flex
  flex-direction column
  align-items center

  &::after
    content "•"
    opacity 0

  &:hover
    opacity 0.6

    &::after
      opacity 0.3

.tabs > button.active, .tabs > button[aria-selected="true"]
  opacity 0.8

  &::after
    opacity 0.8
</style>
