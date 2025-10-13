<script lang="ts">
  import { debounce } from "$lib/utils/helpers.js";
  import type { ValidationError } from "$lib/validation/hazard-validation.js";

  interface Props {
    field: string;
    value: any;
    context?: any;
    validateOnBlur?: boolean;
    validateOnInput?: boolean;
    debounceMs?: number;
    disabled?: boolean;
    children?: import('svelte').Snippet<[{
      isValidating: boolean;
      isValid: boolean;
      hasError: boolean;
      validationError: ValidationError | null;
      handleBlur: () => void;
    }]>;
  }

  let {
    field,
    value = $bindable(),
    context = null,
    validateOnBlur = true,
    validateOnInput = true,
    debounceMs = 500,
    disabled = false,
    children
  }: Props = $props();

  let validationError = $state<ValidationError | null>(null);
  let isValidating = $state(false);
  let hasValidated = $state(false);

  const isValid = $derived(!validationError && hasValidated);
  const hasError = $derived(validationError !== null);

  // Debounced validation function
  const debouncedValidate = debounce(validateField, debounceMs);

  // Watch for value changes
  $effect(() => {
    if (validateOnInput && value !== undefined && !disabled) {
      debouncedValidate();
    }
  });

  async function validateField() {
    if (disabled || value === undefined) return;

    isValidating = true;
    validationError = null;

    try {
      const response = await fetch("/api/validation/field", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          field,
          value,
          context,
        }),
      });

      const result = await response.json();

      if (!result.success && result.error) {
        validationError = {
          field: result.field || field,
          message: result.error,
          code: result.code || "VALIDATION_ERROR",
        };
      } else {
        validationError = null;
      }

      hasValidated = true;
    } catch (error) {
      console.error("Field validation error:", error);
      validationError = {
        field,
        message: "Unable to validate field. Please check your connection.",
        code: "NETWORK_ERROR",
      };
      hasValidated = true;
    } finally {
      isValidating = false;
    }
  }

  function handleBlur() {
    if (validateOnBlur && !disabled) {
      validateField();
    }
  }

  function clearValidation() {
    validationError = null;
    hasValidated = false;
  }

  // Export validation status for parent components
  export function getValidationStatus() {
    return {
      isValid,
      hasError,
      error: validationError,
      isValidating,
      hasValidated,
    };
  }

  // Export manual validation trigger
  export function validate() {
    return validateField();
  }

  // Clear validation when field is cleared
  export function clear() {
    clearValidation();
  }
</script>

<!-- Validation indicator overlay -->
<div
  class="field-validator"
  class:validating={isValidating}
  class:valid={isValid}
  class:error={hasError}
>
  {@render children?.({ isValidating, isValid, hasError, validationError, handleBlur })}

  {#if isValidating}
    <div class="validation-indicator validating">
      <span class="spinner">⟳</span>
      <span class="sr-only">Validating...</span>
    </div>
  {:else if isValid}
    <div class="validation-indicator valid">
      <span class="check-icon">✓</span>
      <span class="sr-only">Valid</span>
    </div>
  {:else if hasError}
    <div class="validation-indicator error">
      <span class="error-icon">✗</span>
      <span class="sr-only">Invalid</span>
    </div>
  {/if}

  {#if hasError && validationError}
    <div class="field-error" role="alert">
      <span class="error-icon">⚠️</span>
      <span class="error-message">{validationError.message}</span>
    </div>
  {/if}
</div>

<style>
  .field-validator {
    position: relative;
    width: 100%;
  }

  .validation-indicator {
    position: absolute;
    top: 50%;
    right: 0.75rem;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    font-size: 0.875rem;
    font-weight: bold;
    pointer-events: none;
    z-index: 10;
  }

  .validation-indicator.validating {
    background: rgba(108, 117, 125, 0.1);
    color: #6c757d;
  }

  .validation-indicator.valid {
    background: rgba(40, 167, 69, 0.1);
    color: #28a745;
  }

  .validation-indicator.error {
    background: rgba(220, 53, 69, 0.1);
    color: #dc3545;
  }

  .spinner {
    display: inline-block;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .check-icon,
  .error-icon {
    line-height: 1;
  }

  .field-error {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin-top: 0.375rem;
    padding: 0.5rem;
    background: #fdf2f2;
    border: 1px solid #fed7d7;
    border-radius: 6px;
    font-size: 0.875rem;
    color: #721c24;
  }

  .field-error .error-icon {
    flex-shrink: 0;
    font-size: 1rem;
    margin-top: 0.1rem;
  }

  .error-message {
    line-height: 1.4;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* Adjust input styles when validation is active */
  :global(.field-validator.validating input),
  :global(.field-validator.validating select),
  :global(.field-validator.validating textarea) {
    padding-right: 2.5rem;
    border-color: #6c757d;
  }

  :global(.field-validator.valid input),
  :global(.field-validator.valid select),
  :global(.field-validator.valid textarea) {
    padding-right: 2.5rem;
    border-color: #28a745;
    box-shadow: 0 0 0 0.125rem rgba(40, 167, 69, 0.25);
  }

  :global(.field-validator.error input),
  :global(.field-validator.error select),
  :global(.field-validator.error textarea) {
    padding-right: 2.5rem;
    border-color: #dc3545;
    box-shadow: 0 0 0 0.125rem rgba(220, 53, 69, 0.25);
  }

  /* Focus states */
  :global(.field-validator input:focus),
  :global(.field-validator select:focus),
  :global(.field-validator textarea:focus) {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 0.125rem rgba(0, 123, 255, 0.25);
  }

  :global(.field-validator.error input:focus),
  :global(.field-validator.error select:focus),
  :global(.field-validator.error textarea:focus) {
    border-color: #dc3545;
    box-shadow: 0 0 0 0.125rem rgba(220, 53, 69, 0.25);
  }
</style>
