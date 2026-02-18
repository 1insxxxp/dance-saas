<script setup lang="ts">
import { reactive } from "vue";
import { message } from "ant-design-vue";
import { PlusOutlined } from "@ant-design/icons-vue";

const props = defineProps<{
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: "create", payload: { name: string; phone?: string }): void;
}>();

const form = reactive({
  name: "",
  phone: "",
});

function handleCreate() {
  const name = form.name.trim();
  if (!name) {
    message.warning("请输入学员姓名");
    return;
  }

  const phone = form.phone.trim();
  emit("create", {
    name,
    phone: phone || undefined,
  });

  form.name = "";
  form.phone = "";
}
</script>

<template>
  <div class="student-form">
    <a-form layout="vertical" @submit.prevent="handleCreate">
      <a-form-item label="学员姓名" required>
        <a-input
          v-model:value="form.name"
          name="student-name"
          placeholder="请输入学员姓名…"
          autocomplete="name"
          allow-clear
        />
      </a-form-item>

      <a-form-item label="联系电话（可选）">
        <a-input
          v-model:value="form.phone"
          name="student-phone"
          placeholder="请输入手机号…"
          autocomplete="tel"
          allow-clear
        />
      </a-form-item>

      <a-button class="create-btn" type="primary" :loading="props.loading" @click="handleCreate">
        <template #icon>
          <PlusOutlined aria-hidden="true" />
        </template>
        立即创建
      </a-button>
    </a-form>
  </div>
</template>

<style scoped>
.student-form {
  padding-top: 4px;
}

:deep(.ant-form-item-label > label) {
  color: #1e3a8a;
  font-weight: 600;
}

:deep(.ant-input) {
  border-radius: 12px;
  min-height: 40px;
}

.create-btn {
  min-width: 126px;
}

@media (max-width: 640px) {
  .create-btn {
    width: 100%;
  }
}
</style>
