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
  <div class="pagination" aria-label="分页导航">
    <p class="info">第 {{ currentPage }} / {{ totalPages }} 页，共 {{ total }} 条</p>

    <div class="actions">
      <button type="button" class="nav-btn" :disabled="isPrevDisabled" @click="goPrev">上一页</button>
      <button type="button" class="nav-btn nav-btn-next" :disabled="isNextDisabled" @click="goNext">下一页</button>
    </div>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed rgba(147, 197, 253, 0.65);
}

.info {
  margin: 0;
  font-size: 14px;
  color: #1e3a8a;
  font-variant-numeric: tabular-nums;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-btn {
  min-width: 82px;
  padding: 7px 12px;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  color: #1e3a8a;
  cursor: pointer;
  transition:
    transform 120ms ease,
    box-shadow 120ms ease,
    border-color 120ms ease,
    background-color 120ms ease;
}

.nav-btn-next {
  border-color: #93c5fd;
  background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
}

.nav-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: #60a5fa;
  box-shadow: 0 8px 16px rgba(37, 99, 235, 0.15);
}

.nav-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

@media (max-width: 640px) {
  .pagination {
    flex-direction: column;
    align-items: stretch;
  }

  .actions {
    justify-content: flex-end;
  }
}
</style>
