<script lang="ts" context="module">
  export type CheckboxChangeEvent = CustomEvent<{
    value: string;
  }>

</script>  

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let value: string;
  export let name: string;
  export let id: string;
  export let selected = false;

  const dispatch = createEventDispatcher();

  const handleChange = () => {
    dispatch('change', {
      value: id,
    });
  };
</script>

<section class="checkbox">
  <input 
    value={value}
    name={name}
    id={id}
    type="checkbox"
    checked={selected}
    on:change={handleChange}
  >
  <label for={id}><slot /></label>
</section>

<style lang="postcss">
.checkbox {
	align-items: center;
  break-inside: avoid;
	cursor: default;
	display: flex;
	height: var(--size-medium);
	position: relative;

	input {
		opacity: 0;
		width: 10px;
		height: 10px;
		margin: 0;
		padding: 0;
	}

	label {
		align-items: center;
    border: 1px solid transparent;
		display: flex;
		font-size: var(--font-size-xsmall);
		margin-left: -16px;
		padding: 0 var(--size-xsmall) 0 var(--size-xsmall);
		height: 100%;
		user-select: none;
    width: 100%;

    &:hover {
      background-color: var(--figma-color-bg-hover);
    }
	}

	label:before {
		border: 1px solid var(--figma-color-icon);
		border-radius: var(--border-radius-small);
		content: '';
		display: block;
		width: 10px;
		height: 10px;
		margin: -1px 10px 0 -8px;
		box-shadow: none;
	}

	/* unchecked */
	/*
	&__box:focus + &__label:before {
		border: 1px solid var(--white);
	    box-shadow: 0 0 0 2px var(--blue);
	}*/
	input:disabled + label {
		color: var(--figma-color-icon-disabled);
		opacity: 0.3;
	}

	/* checked */
	input:checked + label:before {
		background-color: var(--figma-color-bg-brand);
		background-image: url('data:image/svg+xml;utf8,%3Csvg%20fill%3D%22none%22%20height%3D%227%22%20viewBox%3D%220%200%208%207%22%20width%3D%228%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20clip-rule%3D%22evenodd%22%20d%3D%22m1.17647%201.88236%201.88235%201.88236%203.76471-3.76472%201.17647%201.17648-4.94118%204.9412-3.05882-3.05884z%22%20fill%3D%22%23fff%22%20fill-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E');
		background-repeat: no-repeat;
		background-position: 1px 2px;
		border: 1px solid var(--figma-color-bg-brand);
	}
	/*
	&__box:checked:focus + &__label:before {
		border: 1px solid var(--white);
	    box-shadow: 0 0 0 2px var(--blue);
	}*/
	input:checked:disabled + label:before {
		border: 1px solid transparent;
		background-color: var(--figma-color-icon-disabled);
	}
}
</style>
