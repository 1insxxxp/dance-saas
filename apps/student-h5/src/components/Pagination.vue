<script setup lang="ts">
import { computed, useAttrs } from "vue";

const props = defineProps<{
  page: number;
  pageSize: number;
  total: number;
}>();

const emit = defineEmits<{
  (e: "change", newPage: number): void;
}>();

// 兼容未改造页面：如果外部传的是 current，则回退使用 current。
const attrs = useAttrs() as {
  current?: number;
};

const currentPage = computed(() => {
  if (typeof props.page === "number" && Number.isFinite(props.page)) {
    return props.page;
  }
  if (typeof attrs.current === "number" && Number.isFinite(attrs.current)) {
    return attrs.current;
  }
  return 1;
});

const totalPages = computed(() => {
  if (!props.pageSize || props.pageSize < 1) {
    return 1;
  }
  return Math.max(1, Math.ceil(props.total / props.pageSize));
});

const isPrevDisabled = computed(() => currentPage.value <= 1);
const isNextDisabled = computed(() => currentPage.value >= totalPages.value);

function goPrev() {
  if (isPrevDisabled.value) {
    return;
  }
  emit("change", currentPage.value - 1);
}

function goNext() {
  if (isNextDisabled.value) {
    return;
  }
  emit("change", currentPage.value + 1);
}
</script>

<template>
  <div class="pagination">
    <button type="button" :disabled="isPrevDisabled" @click="goPrev">上一页</button>

    <span class="info">
      第 {{ currentPage }} / {{ totalPages }} 页，共 {{ total }} 条
    </span>

    <button type="button" :disabled="isNextDisabled" @click="goNext">下一页</button>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}

.info {
  font-size: 14px;
}

button {
  padding: 6px 12px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
