<script lang="ts">
  import Route from '@components/Route.svelte';
  import {RoutePages} from '@stores/routes';
  import Pages from './Pages.svelte';
  import BreadCrumb from '@components/BreadCrumb.svelte';
  import Start from './Start.svelte';
  import Download from './Download.svelte';
</script>

<section>
  <header>
    <BreadCrumb to={RoutePages.Start}>Start</BreadCrumb>
    <BreadCrumb to={RoutePages.Pages}>Pages</BreadCrumb>
    <BreadCrumb to={RoutePages.DownloadList}>DownloadList</BreadCrumb>
  </header>
  <main>
    <Route page={RoutePages.Start}>
      <Start />
    </Route>
    <Route page={RoutePages.Pages}>
      <Pages />
    </Route>
    <Route page={RoutePages.DownloadList}>
      <Download />
    </Route>
  </main>
  <footer>
    Developed by Erwin Goossen aka Navelpluisje
  </footer>
</section>

<style lang="postcss">
  main {
    overflow: scroll;
  }
  
  section {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100%;
  }

  header {
    align-items: center;
    border-bottom: 1px solid var(--figma-color-border);
    display: flex;
    height: 40px;
    padding: .5rem 1rem;
  }
  
  footer {
    border-top: 1px solid var(--figma-color-border);
    padding: .5rem 1rem;
    text-align: center;
  }
</style>
