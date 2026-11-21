<script setup lang="ts">
import TierBoard from './components/TierBoard.vue';
import { zhCN, dateZhCN, type GlobalThemeOverrides } from 'naive-ui';

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#18181b',
    primaryColorHover: '#27272a',
    primaryColorPressed: '#09090b',
    primaryColorSuppl: '#18181b',
    borderRadius: '6px',
    borderRadiusSmall: '4px',
    borderColor: '#e4e4e7',
    textColorBase: '#09090b',
    textColor1: '#09090b',
    textColor2: '#27272a',
    textColor3: '#71717a',
  },
  Button: {
    borderRadiusMedium: '6px',
    borderRadiusSmall: '6px',
    fontWeight: '500',
  },
  Input: {
    borderRadius: '6px',
    borderHover: '1px solid #a1a1aa',
    borderFocus: '1px solid #18181b',
    boxShadowFocus: '0 0 0 2px rgba(24, 24, 27, 0.1)',
  },
  Card: {
    borderRadius: '10px',
    borderColor: '#e4e4e7',
    paddingMedium: '20px 24px',
  },
  Drawer: {
    headerPadding: '16px 20px',
    bodyPadding: '20px',
  },
  Dropdown: {
    borderRadius: '8px',
    padding: '4px',
    optionColorHover: '#f4f4f5',
  },
};
</script>

<template>
  <n-config-provider
    :locale="zhCN"
    :date-locale="dateZhCN"
    :theme-overrides="themeOverrides"
  >
    <TierBoard />
  </n-config-provider>
</template>
