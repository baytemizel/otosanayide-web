import type {Component} from 'vue';

export type PanelNavItem = {section: string} | {value: string; label: string; icon: Component; passive?: boolean};
