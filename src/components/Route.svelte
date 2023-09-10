<script lang="ts">
  import { RoutePages, routes } from '@stores/routes';

  export let page: RoutePages;
</script>

{#if $routes.currentPage === page}
  <slot />
{/if}
