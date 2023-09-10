<script lang="ts">
  let className = '';

  export { className as class };
</script>

<header class="title {className}">
  <slot />
</header>

<style lang="postcss">
  header {
    align-items: center;
    display: flex;
    font-size: var(--font-size-xsmall);
    font-weight: var(--font-weight-bold);
    line-height: 1;
    padding: 1rem 0;
  }
</style>
