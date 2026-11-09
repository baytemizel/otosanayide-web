import type {ObjectDirective} from 'vue';

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * Vue re-applies a dynamic `:value` on every render, which would wipe what the user typed into an
 * uncontrolled FormData field. These set the initial value once, like React's defaultValue.
 */
export const vDefaultValue: ObjectDirective<Field, string | number | null | undefined> = {
  mounted(el, binding) {
    el.value = binding.value === null || binding.value === undefined ? '' : String(binding.value);
  },
  getSSRProps: binding => (binding.value === null || binding.value === undefined ? {} : {value: String(binding.value)}),
};

export const vDefaultChecked: ObjectDirective<HTMLInputElement, boolean | null | undefined> = {
  mounted(el, binding) {
    el.checked = !!binding.value;
  },
  getSSRProps: binding => (binding.value ? {checked: true} : {}),
};
