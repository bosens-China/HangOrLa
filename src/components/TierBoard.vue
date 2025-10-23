<script setup lang="ts">
import TierRow from './TierRow.vue';
import Gallery from './Gallery.vue';
import FreeImage from './FreeImage.vue';
import { useBoardStore } from '../stores/useBoardStore';
import { NIcon } from 'naive-ui';
import {
  SettingsOutline,
  TrashOutline,
  AddCircleOutline,
  ReloadOutline,
} from '@vicons/ionicons5';

const {
  canvasRef,
  tiers,
  defaultRowHeightPx,
  defaultLabelWidthPx,
  gallery,
  freeItems,
  showSettings,
  addToCanvas,
  updatePos,
  updateAllImageSize,
  onCanvasDrop,
  resetToDefaults,
  addTier,
  removeTier,
} = useBoardStore();

function updateRowHeight(v: number) {
  defaultRowHeightPx.value = v;
  updateAllImageSize(v);
}

function updateLabelWidth(v: number) {
  defaultLabelWidthPx.value = v;
}
</script>

<template>
  <div class="h-screen flex flex-col">
    <div
      ref="canvasRef"
      class="flex-1 relative overflow-auto"
      @dragover.prevent
      @drop="onCanvasDrop"
    >
      <div>
        <TierRow
          v-for="t in tiers"
          :key="t.id"
          :label="t.label"
          :color="t.color"
          :heightPx="defaultRowHeightPx"
          :labelWidthPx="defaultLabelWidthPx"
          @update:heightPx="updateRowHeight"
          @update:labelWidthPx="updateLabelWidth"
        />
      </div>

      <FreeImage
        v-for="it in freeItems"
        :key="it.id"
        v-bind="it"
        @update:pos="updatePos"
      />
    </div>

    <Gallery
      :height-px="defaultRowHeightPx - 24"
      v-model="gallery"
      @spawn="(it) => addToCanvas([it])"
    />

    <n-float-button
      :right="0"
      :bottom="50"
      type="primary"
      @click="showSettings = true"
    >
      <n-icon>
        <SettingsOutline />
      </n-icon>
    </n-float-button>

    <n-drawer v-model:show="showSettings" placement="right" :width="380">
      <n-drawer-content title="设置">
        <n-form
          label-placement="left"
          label-width="auto"
          require-mark-placement="right-hanging"
        >
          <n-form-item label="行高 (px)">
            <n-input-number
              v-model:value="defaultRowHeightPx"
              :min="60"
              :max="260"
              :step="10"
              size="small"
              @update:value="(v) => v !== null && updateAllImageSize(v)"
            />
          </n-form-item>
          <n-form-item label="行宽 (px)">
            <n-input-number
              v-model:value="defaultLabelWidthPx"
              :min="60"
              :step="10"
              size="small"
            />
          </n-form-item>
          <n-form-item label="行列管理">
            <div class="space-y-2 w-full">
              <div
                v-for="t in tiers"
                :key="t.id"
                class="flex items-center gap-2"
              >
                <n-input v-model:value="t.label" size="small" class="w-28" />
                <n-color-picker
                  v-model:value="t.color"
                  size="small"
                  :show-alpha="false"
                />
                <n-button
                  size="small"
                  tertiary
                  circle
                  type="error"
                  @click="removeTier(t.id)"
                >
                  <template #icon>
                    <n-icon :component="TrashOutline" />
                  </template>
                </n-button>
              </div>
              <n-button size="small" type="primary" ghost @click="addTier">
                <template #icon>
                  <n-icon :component="AddCircleOutline" />
                </template>
                新增项</n-button
              >
            </div>
          </n-form-item>
          <n-form-item label="危险操作">
            <n-button
              size="small"
              type="warning"
              ghost
              @click="resetToDefaults"
            >
              <template #icon>
                <n-icon :component="ReloadOutline" />
              </template>
              恢复默认设置</n-button
            >
          </n-form-item>
        </n-form>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>
