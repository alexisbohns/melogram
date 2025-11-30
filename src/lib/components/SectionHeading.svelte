<h2>
	<slot />
</h2>

<style lang="stylus">
h2
  font-family var(--font-captions)
  letter-spacing 0.06em
  font-size 1.5rem
  color var(--tertiary)
  opacity 0.95
  display flex
  align-items center
  gap 1rem

  &::after
    content ''
    height 2px
    flex 1
    opacity 0.1
    background-color var(--tertiary)
</style>
