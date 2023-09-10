<script lang="ts">
  export let onClick = () => alert('Life has never Svelte better');
  export let disabled = false;
</script>

<button class="button" on:click={onClick} disabled={disabled}>
  <slot />
</button>

<style lang="postcss">
	button {
    align-items: center;
		background-color: var(--figma-color-bg-brand);
    border: 1px solid transparent;
		border-radius: 5px;
		color: var(--figma-color-text-onbrand);
    display: inline-flex;
    font-size: var(--font-size-xsmall);
    font-weight: 500;
    height: var(--size-medium);
    justify-content: center;
    min-width: 8rem;
    padding: 0 1.5rem;

    &:disabled {
      background-color: var(--figma-color-bg-disabled);
      color: var(--figma-color-text-ondisabled);
    }
	}
</style>
