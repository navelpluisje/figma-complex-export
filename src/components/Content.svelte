<script lang="ts">
  let className = '';

  export { className as class };
</script>

<section class="content {className}"><slot /></section>

<style lang="postcss">
  section {
    padding: 1rem;

    &.columns {
      columns: 2;
    }
  }
</style>
