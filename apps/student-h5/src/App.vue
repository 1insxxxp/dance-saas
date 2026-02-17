<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { message } from "ant-design-vue";
import {
  CalendarOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
} from "@ant-design/icons-vue";
import {
  createStudent,
  listStudents,
  removeStudent,
  type Student,
  type StudentListData,
} from "./api/student";

const loading = ref(false);
const creating = ref(false);
const deletingId = ref<number | null>(null);
const liveText = ref("系统就绪");

const students = ref<Student[]>([]);
const total = ref(0);

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: "",
});

const createForm = reactive({
  name: "",
  phone: "",
});

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(total.value / query.pageSize));
});

const summaryText = computed(() => {
  return `共 ${total.value} 位学员 · 第 ${query.page} / ${totalPages.value} 页 · 每页 ${query.pageSize} 条`;
});

const themeConfig = {
  token: {
    colorPrimary: "#0f766e",
    colorInfo: "#0f766e",
    colorSuccess: "#15803d",
    colorWarning: "#b45309",
    colorError: "#b91c1c",
    borderRadius: 14,
    fontFamily: '"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif',
  },
};

function formatTime(value: string): string {
  return dateFormatter.format(new Date(value));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "请求失败，请稍后重试";
}

function readQueryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const nextPage = Number(params.get("page") ?? "1");
  const nextPageSize = Number(params.get("pageSize") ?? "10");

  query.page = Number.isInteger(nextPage) && nextPage > 0 ? nextPage : 1;
  query.pageSize =
    Number.isInteger(nextPageSize) && [5, 10, 20, 50].includes(nextPageSize)
      ? nextPageSize
      : 10;
  query.keyword = (params.get("keyword") ?? "").trim();
}

function writeQueryToUrl() {
  const params = new URLSearchParams();
  if (query.page > 1) {
    params.set("page", String(query.page));
  }
  if (query.pageSize !== 10) {
    params.set("pageSize", String(query.pageSize));
  }
  if (query.keyword.trim()) {
    params.set("keyword", query.keyword.trim());
  }

  const queryString = params.toString();
  const nextUrl = queryString ? `?${queryString}` : window.location.pathname;
  window.history.replaceState(null, "", nextUrl);
}

async function fetchStudents(options?: { resetPage?: boolean }) {
  if (options?.resetPage) {
    query.page = 1;
  }

  loading.value = true;
  liveText.value = "正在同步学员列表";

  try {
    const data: StudentListData = await listStudents({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword.trim() || undefined,
    });

    students.value = data.list;
    total.value = data.total;
    query.page = data.page;
    query.pageSize = data.pageSize;
    writeQueryToUrl();
    liveText.value = `列表已更新，共 ${data.total} 条记录`;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    liveText.value = errorMessage;
    message.error(errorMessage);
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  const name = createForm.name.trim();
  if (!name) {
    message.warning("请输入学员姓名");
    return;
  }

  creating.value = true;
  try {
    await createStudent({
      name,
      phone: createForm.phone.trim() || null,
    });

    createForm.name = "";
    createForm.phone = "";
    message.success("学员创建成功");
    await fetchStudents();
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    creating.value = false;
  }
}

async function handleDelete(id: number) {
  deletingId.value = id;
  try {
    await removeStudent(id);
    message.success("学员已删除");

    if (students.value.length === 1 && query.page > 1) {
      query.page -= 1;
    }

    await fetchStudents();
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    deletingId.value = null;
  }
}

function handleRefresh() {
  void fetchStudents();
}

function handleSearch() {
  void fetchStudents({ resetPage: true });
}

function handlePageChange(nextPage: number, nextPageSize: number) {
  query.page = nextPage;
  query.pageSize = nextPageSize;
  void fetchStudents();
}

function handlePageSizeChange(_current: number, nextPageSize: number) {
  query.page = 1;
  query.pageSize = nextPageSize;
  void fetchStudents();
}

onMounted(() => {
  readQueryFromUrl();
  void fetchStudents();
});
</script>

<template>
  <a-config-provider :theme="themeConfig">
    <a class="skip-link" href="#page-main">跳转到主要内容</a>

    <main id="page-main" class="dashboard">
      <div class="aura aura-left" aria-hidden="true"></div>
      <div class="aura aura-right" aria-hidden="true"></div>
      <div class="aura aura-bottom" aria-hidden="true"></div>

      <section class="hero-card panel">
        <div class="hero-title">
          <p class="hero-kicker">舞蹈预约 SaaS</p>
          <h1>学员运营工作台</h1>
          <p class="hero-desc">
            围绕学员档案做增删与检索，列表状态实时同步，适合日常教务的轻量化管理。
          </p>
        </div>

        <div class="hero-metrics">
          <div class="metric-item">
            <span>学员总数</span>
            <strong>{{ total }}</strong>
          </div>
          <div class="metric-item">
            <span>当前页码</span>
            <strong>{{ query.page }}</strong>
          </div>
          <div class="metric-item">
            <span>每页条数</span>
            <strong>{{ query.pageSize }}</strong>
          </div>
        </div>
      </section>

      <section class="grid-panels">
        <a-card class="panel create-panel" :bordered="false" title="新增学员">
          <a-form layout="vertical" @submit.prevent="handleCreate">
            <a-form-item label="学员姓名" required>
              <a-input
                v-model:value="createForm.name"
                placeholder="请输入学员姓名"
                autocomplete="name"
                allow-clear
              />
            </a-form-item>

            <a-form-item label="联系电话（可选）">
              <a-input
                v-model:value="createForm.phone"
                placeholder="请输入手机号"
                autocomplete="tel"
                allow-clear
              />
            </a-form-item>

            <a-space wrap>
              <a-button type="primary" :loading="creating" @click="handleCreate">
                <template #icon>
                  <PlusOutlined />
                </template>
                立即创建
              </a-button>
              <a-button :loading="loading" @click="handleRefresh">
                <template #icon>
                  <ReloadOutlined />
                </template>
                刷新列表
              </a-button>
            </a-space>
          </a-form>
        </a-card>

        <a-card class="panel search-panel" :bordered="false" title="筛选与分页">
          <a-form layout="vertical">
            <a-form-item label="姓名关键词">
              <a-input
                v-model:value="query.keyword"
                placeholder="输入关键词后点击搜索"
                allow-clear
                @pressEnter="handleSearch"
              >
                <template #prefix>
                  <SearchOutlined />
                </template>
              </a-input>
            </a-form-item>

            <a-form-item label="每页条数">
              <a-select
                v-model:value="query.pageSize"
                :options="[
                  { label: '每页 5 条', value: 5 },
                  { label: '每页 10 条', value: 10 },
                  { label: '每页 20 条', value: 20 },
                  { label: '每页 50 条', value: 50 },
                ]"
                @change="handleSearch"
              />
            </a-form-item>

            <a-space wrap>
              <a-button type="primary" @click="handleSearch">
                <template #icon>
                  <SearchOutlined />
                </template>
                执行搜索
              </a-button>
              <a-button @click="handleRefresh">
                <template #icon>
                  <ReloadOutlined />
                </template>
                重新加载
              </a-button>
            </a-space>

            <p class="summary">{{ summaryText }}</p>
            <p class="live" aria-live="polite">{{ liveText }}</p>
          </a-form>
        </a-card>
      </section>

      <a-card class="panel table-panel" :bordered="false">
        <template #title>
          <div class="table-title">
            <span>学员列表</span>
            <a-space size="small">
              <a-tag color="processing">
                <template #icon>
                  <TeamOutlined />
                </template>
                实时数据
              </a-tag>
              <a-tag color="success">
                <template #icon>
                  <CalendarOutlined />
                </template>
                本地时间显示
              </a-tag>
            </a-space>
          </div>
        </template>

        <a-table
          :data-source="students"
          :loading="loading"
          :pagination="false"
          :scroll="{ x: 860 }"
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
          <a-table-column title="操作" key="action" width="130" fixed="right">
            <template #default="{ record }">
              <a-popconfirm
                title="确认删除该学员吗？"
                ok-text="确认"
                cancel-text="取消"
                @confirm="handleDelete(record.id)"
              >
                <a-button danger size="small" :loading="deletingId === record.id">
                  <template #icon>
                    <DeleteOutlined />
                  </template>
                  删除
                </a-button>
              </a-popconfirm>
            </template>
          </a-table-column>
        </a-table>

        <div class="pagination-wrap">
          <a-pagination
            :current="query.page"
            :page-size="query.pageSize"
            :total="total"
            :show-size-changer="true"
            :page-size-options="['5', '10', '20', '50']"
            :show-total="(v: number) => `共 ${v} 条`"
            @change="handlePageChange"
            @showSizeChange="handlePageSizeChange"
          />
        </div>
      </a-card>
    </main>
  </a-config-provider>
</template>

<style scoped>
.dashboard {
  --bg-1: #f0f9f6;
  --bg-2: #f8f3e8;
  --line: rgba(15, 118, 110, 0.14);
  --text-1: #0b2330;
  --text-2: #4a6372;
  --panel: rgba(255, 255, 255, 0.74);

  position: relative;
  min-height: 100vh;
  padding:
    calc(24px + env(safe-area-inset-top))
    calc(16px + env(safe-area-inset-right))
    calc(28px + env(safe-area-inset-bottom))
    calc(16px + env(safe-area-inset-left));
  background:
    radial-gradient(circle at 8% 8%, rgba(16, 185, 129, 0.2) 0%, transparent 34%),
    radial-gradient(circle at 92% 12%, rgba(14, 116, 144, 0.18) 0%, transparent 32%),
    linear-gradient(140deg, var(--bg-1) 0%, var(--bg-2) 100%);
  color: var(--text-1);
  overflow-x: hidden;
}

.skip-link {
  position: absolute;
  top: -44px;
  left: 14px;
  z-index: 99;
  padding: 10px 14px;
  border-radius: 10px;
  color: #fff;
  background: #0f766e;
  text-decoration: none;
}

.skip-link:focus-visible {
  top: 8px;
  outline: 3px solid #fff;
  outline-offset: 2px;
}

.aura {
  position: fixed;
  z-index: 0;
  pointer-events: none;
  filter: blur(40px);
  opacity: 0.45;
}

.aura-left {
  left: -40px;
  top: -30px;
  width: 220px;
  height: 220px;
  background: #22c55e;
}

.aura-right {
  top: 100px;
  right: -40px;
  width: 260px;
  height: 260px;
  background: #06b6d4;
}

.aura-bottom {
  bottom: -80px;
  left: 32%;
  width: 280px;
  height: 280px;
  background: #f59e0b;
}

.panel,
.hero-card {
  position: relative;
  z-index: 1;
  width: min(1160px, 100%);
  margin: 0 auto 16px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--panel);
  box-shadow:
    0 12px 34px rgba(9, 39, 54, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.66);
  backdrop-filter: blur(10px);
}

.hero-card {
  padding: 22px;
  display: grid;
  gap: 14px;
  grid-template-columns: 1.35fr 1fr;
}

.hero-kicker {
  margin: 0;
  color: #0f766e;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.hero-title h1 {
  margin: 8px 0 12px;
  font-size: clamp(30px, 5.4vw, 54px);
  line-height: 1.05;
  letter-spacing: 0.01em;
  text-wrap: balance;
  font-family:
    "STZhongsong",
    "Songti SC",
    "Noto Serif CJK SC",
    serif;
}

.hero-desc {
  margin: 0;
  max-width: 62ch;
  color: var(--text-2);
  line-height: 1.8;
}

.hero-metrics {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-content: center;
}

.metric-item {
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(15, 118, 110, 0.16);
  background: rgba(255, 255, 255, 0.72);
}

.metric-item span {
  display: block;
  margin-bottom: 4px;
  color: #5d7482;
  font-size: 13px;
}

.metric-item strong {
  font-size: 24px;
  font-variant-numeric: tabular-nums;
}

.grid-panels {
  position: relative;
  z-index: 1;
  width: min(1160px, 100%);
  margin: 0 auto 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.summary {
  margin: 14px 0 8px;
  color: #1f5b57;
  font-variant-numeric: tabular-nums;
}

.live {
  margin: 0;
  color: #3b5564;
}

.table-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.time-text {
  font-variant-numeric: tabular-nums;
  color: #24414f;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

:deep(.ant-card-head-title) {
  font-size: 20px;
  font-weight: 700;
}

:deep(.ant-btn) {
  transition:
    transform 140ms ease,
    box-shadow 140ms ease,
    background-color 140ms ease,
    border-color 140ms ease;
}

:deep(.ant-btn:hover) {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(15, 118, 110, 0.14);
}

:deep(.ant-input:focus-visible),
:deep(.ant-btn:focus-visible),
:deep(.ant-select-selector:focus-visible) {
  outline: 3px solid rgba(15, 118, 110, 0.28);
  outline-offset: 2px;
}

@media (max-width: 980px) {
  .hero-card {
    grid-template-columns: 1fr;
  }

  .hero-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .grid-panels {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .dashboard {
    padding-top: calc(16px + env(safe-area-inset-top));
  }

  .hero-card {
    padding: 16px;
  }

  .hero-title h1 {
    font-size: clamp(28px, 10vw, 40px);
  }

  .hero-metrics {
    grid-template-columns: 1fr;
  }

  .table-title {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  :deep(.ant-btn) {
    transition: background-color 120ms ease, border-color 120ms ease;
    transform: none !important;
  }
}
</style>
