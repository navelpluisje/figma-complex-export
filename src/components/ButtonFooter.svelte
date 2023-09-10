<script lang="ts">
  let className = '';

  export { className as class };
</script>

<footer class="footer {className}"><slot /></footer>

<style lang="postcss">
  footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding: 1rem;
  }
</style>
