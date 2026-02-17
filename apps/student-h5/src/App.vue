<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  createStudent,
  deleteStudent,
  listStudents,
  type Student,
  type StudentListData,
} from "./api/student";

const loading = ref(false);
const creating = ref(false);
const deletingId = ref<number | null>(null);
const students = ref<Student[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const keyword = ref("");
const name = ref("");
const phone = ref("");
const notice = ref("页面已就绪。");

const numberFormatter = new Intl.NumberFormat("zh-CN");
const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const totalPages = computed(() => {
  const pages = Math.ceil(total.value / pageSize.value);
  return pages > 0 ? pages : 1;
});

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

function syncQuery() {
  const params = new URLSearchParams();
  if (page.value > 1) {
    params.set("page", String(page.value));
  }
  if (pageSize.value !== 10) {
    params.set("pageSize", String(pageSize.value));
  }
  const trimmedKeyword = keyword.value.trim();
  if (trimmedKeyword) {
    params.set("keyword", trimmedKeyword);
  }

  const queryString = params.toString();
  const nextUrl = queryString ? `?${queryString}` : window.location.pathname;
  window.history.replaceState(null, "", nextUrl);
}

function applyQueryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const pageFromUrl = Number(params.get("page") ?? 1);
  const pageSizeFromUrl = Number(params.get("pageSize") ?? 10);

  page.value = Number.isInteger(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : 1;
  pageSize.value =
    Number.isInteger(pageSizeFromUrl) &&
    [5, 10, 20, 50].includes(pageSizeFromUrl)
      ? pageSizeFromUrl
      : 10;
  keyword.value = (params.get("keyword") ?? "").trim();
}

async function refresh(options?: { resetPage?: boolean }) {
  if (options?.resetPage) {
    page.value = 1;
  }

  loading.value = true;
  notice.value = "正在加载学员列表…";
  try {
    const data: StudentListData = await listStudents({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value.trim() || undefined,
    });

    students.value = data.list;
    total.value = data.total;
    page.value = data.page;
    pageSize.value = data.pageSize;
    syncQuery();

    notice.value = `列表已更新，共 ${formatNumber(total.value)} 条记录。`;
  } catch {
    notice.value = "加载失败，请检查后端服务是否已启动。";
    window.alert("加载失败，请检查后端服务是否已启动。");
  } finally {
    loading.value = false;
  }
}

async function onCreate() {
  const studentName = name.value.trim();
  if (!studentName) {
    window.alert("请输入学员姓名。");
    return;
  }

  creating.value = true;
  notice.value = "正在提交新增请求…";
  try {
    await createStudent({
      name: studentName,
      phone: phone.value.trim() || undefined,
    });

    name.value = "";
    phone.value = "";
    notice.value = "学员新增成功。";
    await refresh();
  } catch {
    notice.value = "新增失败，请稍后重试。";
    window.alert("新增失败，请稍后重试。");
  } finally {
    creating.value = false;
  }
}

async function onDelete(studentId: number) {
  const confirmed = window.confirm("确认删除该学员吗？此操作不可撤销。");
  if (!confirmed) {
    return;
  }

  deletingId.value = studentId;
  notice.value = "正在删除学员…";
  try {
    await deleteStudent(studentId);

    if (students.value.length === 1 && page.value > 1) {
      page.value -= 1;
    }

    notice.value = "学员已删除。";
    await refresh();
  } catch {
    notice.value = "删除失败，请稍后重试。";
    window.alert("删除失败，请稍后重试。");
  } finally {
    deletingId.value = null;
  }
}

async function onPrevPage() {
  if (page.value <= 1 || loading.value) {
    return;
  }
  page.value -= 1;
  await refresh();
}

async function onNextPage() {
  if (page.value >= totalPages.value || loading.value) {
    return;
  }
  page.value += 1;
  await refresh();
}

onMounted(() => {
  applyQueryFromUrl();
  void refresh();
});
</script>

<template>
  <a class="skip-link" href="#main-content">跳转到主要内容</a>

  <main id="main-content" class="app">
    <header class="hero card">
      <p class="eyebrow">舞蹈预约系统</p>
      <h1>学员管理中心</h1>
      <p class="desc">新增、检索、分页查看与删除学员信息，所有操作实时同步。</p>
    </header>

    <section class="card">
      <h2>新增学员</h2>
      <form class="form-grid" @submit.prevent="onCreate">
        <label class="field">
          <span>学员姓名</span>
          <input
            v-model="name"
            name="name"
            type="text"
            autocomplete="name"
            placeholder="例如：王小明…"
          />
        </label>

        <label class="field">
          <span>联系电话（选填）</span>
          <input
            v-model="phone"
            name="phone"
            type="tel"
            inputmode="tel"
            autocomplete="tel"
            placeholder="例如：13800138000…"
          />
        </label>

        <div class="actions">
          <button class="btn btn-primary" type="submit" :disabled="creating">
            {{ creating ? "提交中…" : "新增学员" }}
          </button>
          <button class="btn btn-secondary" type="button" :disabled="loading" @click="refresh()">
            {{ loading ? "刷新中…" : "刷新列表" }}
          </button>
        </div>
      </form>
    </section>

    <section class="card">
      <div class="toolbar">
        <h2>学员列表</h2>
        <div class="toolbar-actions">
          <label class="field-inline" for="keyword">姓名检索</label>
          <input
            id="keyword"
            v-model="keyword"
            name="keyword"
            type="search"
            autocomplete="off"
            placeholder="输入关键词…"
            @keyup.enter="refresh({ resetPage: true })"
          />
          <select v-model.number="pageSize" aria-label="每页条数" @change="refresh({ resetPage: true })">
            <option :value="5">每页 5 条</option>
            <option :value="10">每页 10 条</option>
            <option :value="20">每页 20 条</option>
            <option :value="50">每页 50 条</option>
          </select>
          <button class="btn btn-secondary" type="button" @click="refresh({ resetPage: true })">
            搜索
          </button>
        </div>
      </div>

      <p class="meta">
        共 {{ formatNumber(total) }} 条记录 · 第 {{ page }} / {{ totalPages }} 页 · 每页 {{ pageSize }} 条
      </p>

      <p class="status" aria-live="polite">{{ notice }}</p>

      <div class="table-wrap">
        <table class="table">
          <caption class="table-caption">
            学员数据表
          </caption>
          <thead>
            <tr>
              <th scope="col">编号</th>
              <th scope="col">姓名</th>
              <th scope="col">手机号</th>
              <th scope="col">创建时间</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="empty">正在加载列表…</td>
            </tr>
            <tr v-else-if="students.length === 0">
              <td colspan="5" class="empty">暂无学员数据。</td>
            </tr>
            <tr v-for="student in students" :key="student.id">
              <td class="num">{{ formatNumber(student.id) }}</td>
              <td>{{ student.name }}</td>
              <td>{{ student.phone ?? "未填写" }}</td>
              <td class="num">{{ formatDate(student.createdAt) }}</td>
              <td>
                <button
                  class="btn btn-danger"
                  type="button"
                  :disabled="deletingId === student.id"
                  @click="onDelete(student.id)"
                >
                  {{ deletingId === student.id ? "删除中…" : "删除" }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pager">
        <button class="btn btn-secondary" type="button" :disabled="loading || page <= 1" @click="onPrevPage">
          上一页
        </button>
        <button
          class="btn btn-secondary"
          type="button"
          :disabled="loading || page >= totalPages"
          @click="onNextPage"
        >
          下一页
        </button>
      </div>
    </section>
  </main>
</template>

<style>
:root {
  color-scheme: light;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  overflow: hidden;
  background: #f1f5f2;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

input,
button,
select {
  font: inherit;
}
</style>

<style scoped>
.app {
  --card: rgba(255, 255, 255, 0.72);
  --text: #1d2930;
  --muted: #5f6d74;
  --line: #ced9d2;
  --primary: #0f6254;
  --primary-hover: #0b4f44;
  --danger: #b84c37;
  --danger-hover: #973a28;
  --ring: #f3aa46;

  height: 100dvh;
  overflow: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 18px 14px 28px;
  color: var(--text);
  background:
    radial-gradient(circle at 4% 0%, rgba(250, 204, 135, 0.65) 0%, transparent 36%),
    radial-gradient(circle at 98% 2%, rgba(143, 207, 195, 0.52) 0%, transparent 42%),
    linear-gradient(160deg, #f9f7f1 0%, #edf6f3 100%);
  font-family:
    "PingFang SC",
    "Hiragino Sans GB",
    "Microsoft YaHei",
    "WenQuanYi Micro Hei",
    sans-serif;
}

.app::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.skip-link {
  position: absolute;
  left: 12px;
  top: -52px;
  z-index: 99;
  padding: 10px 14px;
  border-radius: 10px;
  color: #fff;
  background: #004b40;
  text-decoration: none;
}

.skip-link:focus-visible {
  top: 8px;
  outline: 3px solid #fff;
  outline-offset: 2px;
}

.card {
  width: min(1080px, 100%);
  margin: 0 auto 14px;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--card);
  backdrop-filter: blur(10px);
  box-shadow:
    0 10px 30px rgba(19, 48, 44, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  animation: fadeUp 260ms ease-out both;
}

.hero {
  border-color: rgba(180, 198, 190, 0.9);
  background:
    linear-gradient(130deg, rgba(16, 97, 84, 0.09), rgba(243, 170, 70, 0.14)),
    rgba(255, 255, 255, 0.72);
}

.hero h1 {
  margin: 8px 0;
  font-size: clamp(30px, 5vw, 48px);
  line-height: 1.08;
  text-wrap: balance;
  letter-spacing: 0.01em;
  font-family:
    "STZhongsong",
    "Songti SC",
    "Noto Serif CJK SC",
    serif;
}

.eyebrow {
  margin: 0;
  color: #2f5850;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.desc {
  margin: 0;
  max-width: 62ch;
  color: var(--muted);
  line-height: 1.72;
}

h2 {
  margin: 0 0 14px;
  font-size: 28px;
  line-height: 1.2;
  text-wrap: balance;
  font-family:
    "STSong",
    "Songti SC",
    "Noto Serif CJK SC",
    serif;
}

.form-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: end;
}

.field {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.field span,
.field-inline {
  color: #354a50;
  font-size: 14px;
  font-weight: 700;
}

input,
select {
  width: 100%;
  min-width: 0;
  height: 42px;
  border: 1px solid #bcc7c1;
  border-radius: 12px;
  padding: 0 12px;
  color: var(--text);
  background: #fff;
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease;
}

input::placeholder {
  color: #839197;
}

input:hover,
select:hover {
  border-color: #a9bbb2;
}

input:focus-visible,
select:focus-visible,
.btn:focus-visible {
  outline: 3px solid var(--ring);
  outline-offset: 2px;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn {
  height: 42px;
  border: 0;
  border-radius: 12px;
  padding: 0 14px;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: rgba(16, 97, 84, 0.25);
  transition:
    transform 120ms ease,
    background-color 120ms ease,
    box-shadow 120ms ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.62;
  cursor: not-allowed;
  transform: none;
}

.btn-primary {
  background: var(--primary);
  box-shadow: 0 8px 18px rgba(16, 97, 84, 0.24);
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-secondary {
  background: #5e6e73;
}

.btn-secondary:hover {
  background: #4e5e62;
}

.btn-danger {
  background: var(--danger);
}

.btn-danger:hover {
  background: var(--danger-hover);
}

.toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 10px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.toolbar-actions input {
  width: 220px;
}

.meta {
  margin: 0 0 6px;
  color: #43565d;
}

.status {
  margin: 0 0 14px;
  color: #2f5650;
}

.table-wrap {
  overflow: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
}

.table-wrap::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
}

.table-caption {
  text-align: left;
  padding: 10px 12px;
  color: var(--muted);
}

.table th,
.table td {
  border-bottom: 1px solid #e2e9e3;
  padding: 12px;
  text-align: left;
  white-space: nowrap;
}

.table th {
  background: #eef4f1;
  color: #30464d;
}

.table tr:nth-child(even) td {
  background: #fbfdfb;
}

.table tbody tr:hover td {
  background: #f3f9f6;
}

.num {
  font-variant-numeric: tabular-nums;
}

.empty {
  text-align: center;
  color: #66777f;
}

.pager {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 900px) {
  .card {
    padding: 14px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .toolbar-actions input {
    width: min(100%, 230px);
  }

  .pager {
    justify-content: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card {
    animation: none;
  }

  .btn {
    transition: background-color 120ms ease;
  }
}
</style>
