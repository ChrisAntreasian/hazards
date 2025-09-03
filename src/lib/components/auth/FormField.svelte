<script lang="ts">
  interface Props {
    label: string;
    name: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    value?: string;
    minlength?: number;
  }

  let {
    label,
    name,
    type = "text",
    placeholder = "",
    required = false,
    disabled = false,
    error = "",
    value = $bindable(""),
    minlength,
  }: Props = $props();
</script>

<div class="form-group">
  <label for={name}>
    {label}
    {#if required}<span class="required">*</span>{/if}
  </label>

  <input
    id={name}
    {name}
    {type}
    {placeholder}
    {required}
    {disabled}
    {minlength}
    bind:value
    class:error={!!error}
  />

  {#if error}
    <div class="field-error">{error}</div>
  {/if}
</div>

<style>
  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
    font-size: 0.9rem;
  }

  .required {
    color: #dc2626;
    margin-left: 0.2rem;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  input:disabled {
    background-color: #f9fafb;
    color: #9ca3af;
    cursor: not-allowed;
  }

  input.error {
    border-color: #dc2626;
  }

  input.error:focus {
    border-color: #dc2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
  }

  .field-error {
    color: #dc2626;
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }
</style>
