<script setup lang="ts">
import { EditOutlined, DeleteOutlined } from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import { reactive, watch } from "vue";
import type { Student } from "../api/student";

const props = defineProps<{
  list: Student[];
  deletingId: number | null;
  canDelete: boolean;
  saving: boolean;
  editModalOpen: boolean;
  editingRecord: Student | null;
}>();

const emit = defineEmits<{
  (e: "remove", id: number): void;
  (e: "open-edit", record: Student): void;
  (e: "close-edit"): void;
  (e: "edit", payload: { id: number; payload: { name?: string; phone?: string | null } }): void;
}>();

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function formatTime(value: string): string {
  return dateFormatter.format(new Date(value));
}

function handleRemove(id: number) {
  emit("remove", id);
}

const editForm = reactive({
  name: "",
  phone: "",
});

watch(
  () => [props.editModalOpen, props.editingRecord] as const,
  ([open, record]) => {
    if (!open || !record) {
      return;
    }

    editForm.name = record.name ?? "";
    editForm.phone = record.phone ?? "";
  },
  { immediate: true },
);

function handleOpenEdit(record: Student) {
  emit("open-edit", record);
}

function handleCloseEdit() {
  if (props.saving) {
    return;
  }
  emit("close-edit");
}

function handleSubmitEdit() {
  if (!props.editingRecord) {
    return;
  }

  const name = editForm.name.trim();
  if (!name) {
    message.warning("请输入学员姓名");
    return;
  }

  const phone = editForm.phone.trim();
  emit("edit", {
    id: props.editingRecord.id,
    payload: {
      name,
      phone: phone ? phone : null,
    },
  });
}
</script>

<template>
  <div class="student-table-wrap">
    <a-table
      class="student-table"
      :data-source="props.list"
      :pagination="false"
      :scroll="{ x: 900 }"
      row-key="id"
      :locale="{ emptyText: '暂无学员数据' }"
    >
      <a-table-column title="编号" data-index="id" key="id" width="90" />
      <a-table-column title="姓名" data-index="name" key="name" width="180" />
      <a-table-column title="手机号" data-index="phone" key="phone" width="220">
        <template #default="{ record }">
          {{ record.phone || "未填写" }}
        </template>
      </a-table-column>
      <a-table-column title="创建时间" key="createdAt" width="260">
        <template #default="{ record }">
          <span class="time-text">{{ formatTime(record.createdAt) }}</span>
        </template>
      </a-table-column>
      <a-table-column title="操作" key="action" width="190" fixed="right">
        <template #default="{ record }">
          <a-space size="small">
            <a-button size="small" @click="handleOpenEdit(record)">
              <template #icon>
                <EditOutlined aria-hidden="true" />
              </template>
              编辑
            </a-button>

            <a-popconfirm
              v-if="props.canDelete"
              title="确认删除该学员吗？"
              ok-text="确认"
              cancel-text="取消"
              @confirm="handleRemove(record.id)"
            >
              <a-button danger size="small" :loading="props.deletingId === record.id">
                <template #icon>
                  <DeleteOutlined aria-hidden="true" />
                </template>
                删除
              </a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </a-table-column>
    </a-table>

    <a-modal
      :open="props.editModalOpen"
      title="编辑学员"
      ok-text="保存"
      cancel-text="取消"
      :confirm-loading="props.saving"
      :ok-button-props="{ disabled: props.saving }"
      :mask-closable="!props.saving"
      @ok="handleSubmitEdit"
      @cancel="handleCloseEdit"
    >
      <a-form layout="vertical">
        <a-form-item label="学员姓名" required>
          <a-input
            v-model:value="editForm.name"
            placeholder="请输入学员姓名"
            :disabled="props.saving"
            allow-clear
          />
        </a-form-item>

        <a-form-item label="联系电话（可选）">
          <a-input
            v-model:value="editForm.phone"
            placeholder="请输入手机号"
            :disabled="props.saving"
            allow-clear
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.student-table-wrap {
  border-radius: 14px;
  overflow: hidden;
}

.time-text {
  font-variant-numeric: tabular-nums;
  color: #1e3a8a;
}

:deep(.student-table .ant-table) {
  background: transparent;
}

:deep(.student-table .ant-table-container) {
  border: 1px solid rgba(191, 219, 254, 0.65);
  border-radius: 14px;
}

:deep(.student-table .ant-table-thead > tr > th) {
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.98) 0%, rgba(219, 234, 254, 0.72) 100%);
  color: #1e3a8a;
  font-weight: 700;
  border-bottom: 1px solid rgba(147, 197, 253, 0.55);
}

:deep(.student-table .ant-table-tbody > tr:nth-child(2n) > td) {
  background: rgba(248, 250, 255, 0.88);
}

:deep(.student-table .ant-table-tbody > tr:hover > td) {
  background: rgba(219, 234, 254, 0.78) !important;
}

:deep(.student-table .ant-btn-dangerous) {
  border-color: #fecaca;
  color: #b91c1c;
  background: rgba(254, 242, 242, 0.92);
}

:deep(.student-table .ant-btn-dangerous:hover) {
  border-color: #fca5a5;
  background: #fee2e2;
}
</style>
