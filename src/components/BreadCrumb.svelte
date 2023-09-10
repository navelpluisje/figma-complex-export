<script lang="ts">
  import { RoutePages, routes } from '@stores/routes';

  export let to: RoutePages;

  const handleBreadCrumbClick = () => {
    routes.setPage(to);
  };

  $: activeClass = to === $routes.currentPage ? 'active' : '';
</script>

<button class="breadcrumb {activeClass}" on:click={handleBreadCrumbClick}>
  <slot /> &gt;
</button>

<style lang="postcss">
  .breadcrumb {
    border: none;
    background: none;
    font-size: var(--font-size-xsmall);
    color: var(--figma-color-text-secondary);
    font-weight: 400;

    &.active {
      color: var(--figma-color-text);
      font-weight: 600;
    }
  }
</style>
