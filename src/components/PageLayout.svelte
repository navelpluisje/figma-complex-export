<script lang="ts">
  let className = '';

  export { className as class };
</script>

<section class={className}><slot /></section>

<style lang="postcss">
  section {
    display: grid;
    grid-template-columns: 2fr 1fr;
    grid-template-rows: auto 1fr auto;
    grid-template-areas:
      "header explanation"
      "pages explanation"
      "footer explanation";
    height: 100%;

    :global(> .title) {
      grid-area: header;
      padding: 1rem 1rem 0;
    }

    :global(> .content) {
      grid-area: pages;
      overflow: scroll;
    }
    
    :global(> .sidebar) {
      grid-area: explanation;
    }
  
    :global(> .footer) {
      grid-area: footer;
    }
  }
  
</style>
