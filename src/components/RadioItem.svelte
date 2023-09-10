<script lang="ts" context="module">
  export type RadioChangeEvent = CustomEvent<{
    value: string;
    id: string;
  }>

</script>  

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let value: string;
  export let name: string;
  export let id: string;

  
  const dispatch = createEventDispatcher();

  const handleChange = () => {
    dispatch('change', {
      value,
      id,
    });
  };
</script>

<section class="radio">
  <input 
    value={value}
    name={name}
    id={id}
    type="radio"
    on:change={handleChange}
  >
  <label for={id}><slot /></label>
</section>

<style lang="postcss">
.radio {
  align-items: center;
	cursor: default;
	display: flex;
	height: var(--size-medium);
  
	input {
    clip: rect(0,0,0,0);
    position: absolute;
	}

	label {
		align-items: center;
    border: 1px solid transparent;
		display: flex;
		font-size: var(--font-size-xsmall);
		padding: 0 var(--size-xsmall) 0 var(--size-xsmall);
		height: 100%;
		user-select: none;
    width: calc(100% + var(--size-xsmall));
    margin-left: calc(-1 * var(--size-xsmall));

    &:hover {
      border-color: var(--blue);
    }
	}

	input:disabled + label {
		color: var(--black);
		opacity: 0.3;
	}

	input:checked + label {
		background-color: #daebf7;
  }
}
</style>
