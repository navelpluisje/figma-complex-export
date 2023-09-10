<script lang="ts">
  let className = '';

  export { className as class };
</script>

<aside class="sidebar {className}"><slot /></aside>

<style lang="postcss">
  aside {
    border-left: 1px solid var(--figma-color-border);
    grid-area: explanation;
    padding: .5rem 1rem;
  }
</style>
