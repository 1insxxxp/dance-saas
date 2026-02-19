<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { message } from "ant-design-vue";
import {
  CalendarOutlined,
  LockOutlined,
  LoginOutlined,
  LogoutOutlined,
  ReloadOutlined,
  SettingOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons-vue";
import {
  createStudent,
  listStudents,
  removeStudent,
  updateStudent,
  type Student,
  type StudentListData,
} from "./api/student";
import { request } from "./api/request";
import { usePagination } from "./composables/usePagination";
import Pagination from "./components/Pagination.vue";
import StudentForm from "./components/StudentForm.vue";
import StudentTable from "./components/StudentTable.vue";

const TOKEN_KEY = "token";
const ACCESS_TOKEN_KEY = "accessToken";
const ROLE_KEY = "role";
const LOGIN_PATH = "/login";
const DASHBOARD_PATH = "/";
const AUTH_LOGOUT_EVENT = "auth:logout";
type AdminRole = "SUPER" | "NORMAL" | "";

const uiState = reactive({
  listLoading: false,
  saving: false,
  deletingId: null as number | null,
});
const editModalOpen = ref(false);
const editingRecord = ref<Student | null>(null);
const liveText = ref("系统就绪");
const isAuthenticated = ref(false);
const currentRole = ref<AdminRole>("");
const loginLoading = ref(false);
const loginForm = reactive({
  username: "",
  password: "",
});

const students = ref<Student[]>([]);
const {
  page,
  pageSize,
  total,
  handlePageChange: setPage,
  resetPage,
} = usePagination();

const query = reactive({
  keyword: "",
});
let keywordDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(total.value / pageSize.value));
});

const summaryText = computed(() => {
  return `共 ${total.value} 位学员 · 第 ${page.value} / ${totalPages.value} 页 · 每页 ${pageSize.value} 条`;
});

const canDelete = computed(() => currentRole.value === "SUPER");

const themeConfig = {
  token: {
    colorPrimary: "#2563eb",
    colorInfo: "#2563eb",
    colorSuccess: "#16a34a",
    colorWarning: "#d97706",
    colorError: "#dc2626",
    borderRadius: 16,
    fontFamily:
      '"Source Han Sans SC","PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif',
  },
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "请求失败，请稍后重试";
}

function replacePath(path: string) {
  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname !== path) {
    window.history.replaceState(null, "", path);
  }
}

function clearDashboardState() {
  students.value = [];
  total.value = 0;
  resetPage();
  query.keyword = "";
  editModalOpen.value = false;
  editingRecord.value = null;
  liveText.value = "系统就绪";
}

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    window.localStorage.getItem(ACCESS_TOKEN_KEY) ??
    window.localStorage.getItem(TOKEN_KEY) ??
    ""
  );
}

function normalizeRole(value: unknown): AdminRole {
  return value === "SUPER" || value === "NORMAL" ? value : "";
}

function getStoredRole(): AdminRole {
  if (typeof window === "undefined") {
    return "";
  }

  return normalizeRole(window.localStorage.getItem(ROLE_KEY));
}

function setRole(role: AdminRole) {
  currentRole.value = role;

  if (typeof window === "undefined") {
    return;
  }

  if (role) {
    window.localStorage.setItem(ROLE_KEY, role);
    return;
  }

  window.localStorage.removeItem(ROLE_KEY);
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const segments = token.split(".");
  if (segments.length < 2) {
    return null;
  }

  try {
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = window.atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractRoleFromToken(token: string): AdminRole {
  const payload = parseJwtPayload(token);
  return normalizeRole(payload?.role);
}

function syncAuthState() {
  const token = getToken();
  isAuthenticated.value = Boolean(token);

  if (isAuthenticated.value) {
    const storedRole = getStoredRole();
    setRole(storedRole || extractRoleFromToken(token));

    if (window.location.pathname === LOGIN_PATH) {
      replacePath(DASHBOARD_PATH);
    }
    return;
  }

  setRole("");
  clearDashboardState();
  replacePath(LOGIN_PATH);
}

function handleLogout(options?: { silent?: boolean }) {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem("refreshToken");
  }
  setRole("");

  isAuthenticated.value = false;
  clearDashboardState();
  replacePath(LOGIN_PATH);

  if (!options?.silent) {
    message.success("已退出登录");
  }
}

async function handleLogin() {
  const username = loginForm.username.trim();
  const password = loginForm.password.trim();

  if (!username || !password) {
    message.warning("请输入用户名和密码");
    return;
  }

  loginLoading.value = true;
  try {
    const result = await request.post<{
      token?: string;
      accessToken?: string;
      role?: "SUPER" | "NORMAL";
    }>("/auth/login", {
      username,
      password,
    });

    const accessToken = result.accessToken ?? result.token;
    if (!accessToken) {
      throw new Error("登录返回的 token 数据不完整");
    }

    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.localStorage.setItem(TOKEN_KEY, accessToken);
    setRole(normalizeRole(result.role) || extractRoleFromToken(accessToken));
    isAuthenticated.value = true;
    loginForm.username = "";
    loginForm.password = "";
    replacePath(DASHBOARD_PATH);
    message.success("登录成功");
    readQueryFromUrl();
    await fetchStudents();
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    loginLoading.value = false;
  }
}

function readQueryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const nextPage = Number(params.get("page") ?? "1");
  const nextPageSize = Number(params.get("pageSize") ?? "10");

  page.value = Number.isInteger(nextPage) && nextPage > 0 ? nextPage : 1;
  pageSize.value =
    Number.isInteger(nextPageSize) && [5, 10, 20, 50].includes(nextPageSize)
      ? nextPageSize
      : 10;
  query.keyword = (params.get("keyword") ?? "").trim();
}

function writeQueryToUrl() {
  const params = new URLSearchParams();
  if (page.value > 1) {
    params.set("page", String(page.value));
  }
  if (pageSize.value !== 10) {
    params.set("pageSize", String(pageSize.value));
  }
  if (query.keyword.trim()) {
    params.set("keyword", query.keyword.trim());
  }

  const queryString = params.toString();
  const nextUrl = queryString ? `?${queryString}` : window.location.pathname;
  window.history.replaceState(null, "", nextUrl);
}

async function fetchStudents(options?: { resetPage?: boolean; skipOverflowCheck?: boolean }) {
  if (options?.resetPage) {
    resetPage();
  }

  uiState.listLoading = true;
  liveText.value = "正在同步学员列表…";

  try {
    const data: StudentListData = await listStudents({
      page: page.value,
      pageSize: pageSize.value,
      keyword: query.keyword.trim() || undefined,
    });

    students.value = data.list;
    total.value = data.total;
    page.value = data.page;
    pageSize.value = data.pageSize;

    const maxPage = Math.max(1, Math.ceil(total.value / pageSize.value));
    if (!options?.skipOverflowCheck && page.value > maxPage) {
      page.value = maxPage;
      await fetchStudents({ skipOverflowCheck: true });
      return;
    }

    writeQueryToUrl();
    liveText.value = `列表已更新，共 ${data.total} 条记录`;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    liveText.value = errorMessage;
    message.error(errorMessage);
  } finally {
    uiState.listLoading = false;
  }
}

async function handleCreate(payload: { name: string; phone?: string }) {
  uiState.saving = true;
  try {
    await createStudent({
      name: payload.name.trim(),
      phone: payload.phone?.trim() || null,
    });

    message.success("学员创建成功");
    await fetchStudents();
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    uiState.saving = false;
  }
}

async function handleDelete(id: number) {
  uiState.deletingId = id;
  try {
    await removeStudent(id);
    message.success("学员已删除");

    if (students.value.length === 1 && page.value > 1) {
      page.value -= 1;
    }

    await fetchStudents();
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    uiState.deletingId = null;
  }
}

function handleOpenEdit(record: Student) {
  editingRecord.value = record;
  editModalOpen.value = true;
}

function handleCloseEdit() {
  if (uiState.saving) {
    return;
  }

  editModalOpen.value = false;
  editingRecord.value = null;
}

async function handleEdit(payload: {
  id: number;
  payload: { name?: string; phone?: string | null };
}) {
  uiState.saving = true;
  try {
    await updateStudent(payload.id, payload.payload);
    message.success("学员信息已更新");
    await fetchStudents();
    editModalOpen.value = false;
    editingRecord.value = null;
  } catch (error) {
    message.error(getErrorMessage(error));
  } finally {
    uiState.saving = false;
  }
}

function handleRefresh() {
  if (keywordDebounceTimer) {
    clearTimeout(keywordDebounceTimer);
    keywordDebounceTimer = null;
  }
  void fetchStudents({ resetPage: true });
}

function handleSearch() {
  if (keywordDebounceTimer) {
    clearTimeout(keywordDebounceTimer);
    keywordDebounceTimer = null;
  }
  void fetchStudents({ resetPage: true });
}

function handleKeywordInput() {
  if (keywordDebounceTimer) {
    clearTimeout(keywordDebounceTimer);
  }

  resetPage();
  keywordDebounceTimer = setTimeout(() => {
    void fetchStudents();
    keywordDebounceTimer = null;
  }, 500);
}

function handlePageChange(newPage: number) {
  setPage(newPage);
  void fetchStudents();
}

function handleAuthLogoutEvent() {
  handleLogout({ silent: true });
}

onMounted(() => {
  window.addEventListener(AUTH_LOGOUT_EVENT, handleAuthLogoutEvent);
  syncAuthState();
  if (!isAuthenticated.value) {
    return;
  }

  readQueryFromUrl();
  void fetchStudents();
});

onBeforeUnmount(() => {
  window.removeEventListener(AUTH_LOGOUT_EVENT, handleAuthLogoutEvent);

  if (keywordDebounceTimer) {
    clearTimeout(keywordDebounceTimer);
    keywordDebounceTimer = null;
  }
});
</script>

<template>
  <a-config-provider :theme="themeConfig">
    <main v-if="!isAuthenticated" class="login-shell">
      <section class="login-card" aria-label="登录表单">
        <p class="login-kicker">舞蹈预约 SaaS</p>
        <h1>管理员登录</h1>
        <p class="login-desc">请输入账号密码，登录后进入学员管理工作台。</p>

        <a-form layout="vertical" @submit.prevent="handleLogin">
          <a-form-item label="用户名" required>
            <a-input
              v-model:value="loginForm.username"
              autocomplete="username"
              placeholder="请输入用户名"
              @pressEnter="handleLogin"
            >
              <template #prefix>
                <UserOutlined aria-hidden="true" />
              </template>
            </a-input>
          </a-form-item>

          <a-form-item label="密码" required>
            <a-input-password
              v-model:value="loginForm.password"
              autocomplete="current-password"
              placeholder="请输入密码"
              @pressEnter="handleLogin"
            >
              <template #prefix>
                <LockOutlined aria-hidden="true" />
              </template>
            </a-input-password>
          </a-form-item>

          <a-button block type="primary" :loading="loginLoading" @click="handleLogin">
            <template #icon>
              <LoginOutlined aria-hidden="true" />
            </template>
            登录
          </a-button>
        </a-form>
      </section>
    </main>

    <template v-else>
      <a class="skip-link" href="#page-main">跳转到主要内容</a>

      <main id="page-main" class="dashboard">
        <div class="orb orb-left" aria-hidden="true"></div>
        <div class="orb orb-right" aria-hidden="true"></div>
        <div class="orb orb-bottom" aria-hidden="true"></div>

        <header class="workspace-toolbar panel">
          <div class="workspace-meta">
            <p class="workspace-kicker">控制中心</p>
            <h2>教务工作台</h2>
            <p>欢迎回来，当前已连接到学员服务。</p>
          </div>

          <div class="workspace-actions">
            <a-tag color="success">在线状态</a-tag>

            <a-dropdown :trigger="['click']">
              <a-button class="settings-btn">
                <template #icon>
                  <SettingOutlined aria-hidden="true" />
                </template>
                设置
              </a-button>

              <template #overlay>
                <a-menu :selectable="false">
                  <a-menu-item key="logout" @click="handleLogout()">
                    <template #icon>
                      <LogoutOutlined aria-hidden="true" />
                    </template>
                    退出登录
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>
        </header>

        <section class="hero-card panel">
          <div class="hero-title">
            <p class="hero-kicker">舞蹈预约 SaaS</p>
            <h1>学员运营工作台</h1>
            <p class="hero-desc">
              把学员数据管理做成一个统一入口，新增、检索、分页与删除全流程实时联动。
            </p>
            <div class="hero-pill-row" aria-hidden="true">
              <span class="hero-pill">实时同步</span>
              <span class="hero-pill">分页检索</span>
              <span class="hero-pill">操作可追踪</span>
            </div>
          </div>

          <div class="hero-metrics">
            <div class="metric-item">
              <span>学员总数</span>
              <strong>{{ total }}</strong>
            </div>
            <div class="metric-item">
              <span>当前页码</span>
              <strong>{{ page }}</strong>
            </div>
            <div class="metric-item">
              <span>每页条数</span>
              <strong>{{ pageSize }}</strong>
            </div>
          </div>
        </section>

        <section class="grid-panels">
          <a-card class="panel create-panel" :bordered="false" title="新增学员">
            <StudentForm :loading="uiState.saving" @create="handleCreate" />

            <div class="create-card-actions">
              <a-button :loading="uiState.listLoading" @click="handleRefresh">
                <template #icon>
                  <ReloadOutlined />
                </template>
                刷新列表
              </a-button>
            </div>
          </a-card>

          <a-card class="panel search-panel" :bordered="false" title="筛选与分页">
            <a-form layout="vertical">
              <a-form-item label="姓名关键词">
                <a-input
                  v-model:value="query.keyword"
                  name="keyword"
                  autocomplete="off"
                  placeholder="输入关键词后点击搜索…"
                  allow-clear
                  @input="handleKeywordInput"
                  @pressEnter="handleSearch"
                >
                  <template #prefix>
                    <SearchOutlined aria-hidden="true" />
                  </template>
                </a-input>
              </a-form-item>

              <a-form-item label="每页条数">
                <a-select
                  v-model:value="pageSize"
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
                    <SearchOutlined aria-hidden="true" />
                  </template>
                  执行搜索
                </a-button>
                <a-button @click="handleRefresh">
                  <template #icon>
                    <ReloadOutlined aria-hidden="true" />
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
                    <TeamOutlined aria-hidden="true" />
                  </template>
                  实时数据
                </a-tag>
                <a-tag color="success">
                  <template #icon>
                    <CalendarOutlined aria-hidden="true" />
                  </template>
                  本地时间显示
                </a-tag>
              </a-space>
            </div>
          </template>

          <a-spin :spinning="uiState.listLoading">
            <StudentTable
              :list="students"
              :deleting-id="uiState.deletingId"
              :can-delete="canDelete"
              :saving="uiState.saving"
              :edit-modal-open="editModalOpen"
              :editing-record="editingRecord"
              @remove="handleDelete"
              @open-edit="handleOpenEdit"
              @close-edit="handleCloseEdit"
              @edit="handleEdit"
            />
          </a-spin>

          <Pagination
            :page="page"
            :page-size="pageSize"
            :total="total"
            @change="handlePageChange"
          />
        </a-card>
      </main>
    </template>
  </a-config-provider>
</template>

<style scoped>
.login-shell {
  min-height: 100vh;
  padding:
    calc(24px + env(safe-area-inset-top))
    calc(16px + env(safe-area-inset-right))
    calc(24px + env(safe-area-inset-bottom))
    calc(16px + env(safe-area-inset-left));
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 15% 10%, rgba(37, 99, 235, 0.2) 0%, transparent 45%),
    radial-gradient(circle at 90% 20%, rgba(6, 182, 212, 0.16) 0%, transparent 40%),
    linear-gradient(145deg, #f6f9ff 0%, #eff6ff 50%, #edfcff 100%);
}

.login-card {
  width: min(460px, 100%);
  border-radius: 20px;
  border: 1px solid rgba(37, 99, 235, 0.14);
  background: rgba(255, 255, 255, 0.82);
  padding: 28px 24px;
  box-shadow:
    0 18px 40px rgba(30, 64, 175, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(14px);
}

.login-kicker {
  margin: 0 0 6px;
  color: #1d4ed8;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.login-card h1 {
  margin: 0;
  font-size: clamp(30px, 7vw, 42px);
  line-height: 1.1;
  letter-spacing: 0.01em;
  font-family:
    "Source Han Serif SC",
    "STZhongsong",
    "Songti SC",
    serif;
  color: #0b1a3f;
}

.login-desc {
  margin: 10px 0 18px;
  color: #475569;
  line-height: 1.7;
}

:deep(.login-card .ant-form-item-label > label) {
  color: #1e3a8a;
  font-weight: 600;
}

.dashboard {
  --bg-1: #f4f7ff;
  --bg-2: #ebf2ff;
  --bg-3: #eefbff;
  --line: rgba(8, 47, 153, 0.16);
  --text-1: #0b1633;
  --text-2: #3b4b72;
  --panel: rgba(255, 255, 255, 0.8);

  position: relative;
  min-height: 100vh;
  padding:
    calc(24px + env(safe-area-inset-top))
    calc(16px + env(safe-area-inset-right))
    calc(30px + env(safe-area-inset-bottom))
    calc(16px + env(safe-area-inset-left));
  background:
    radial-gradient(circle at 12% 2%, rgba(29, 78, 216, 0.22) 0%, transparent 42%),
    radial-gradient(circle at 94% 12%, rgba(6, 182, 212, 0.2) 0%, transparent 42%),
    radial-gradient(circle at 55% 100%, rgba(14, 165, 233, 0.12) 0%, transparent 44%),
    linear-gradient(145deg, var(--bg-1) 0%, var(--bg-2) 48%, var(--bg-3) 100%);
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
  background: #1d4ed8;
  text-decoration: none;
}

.skip-link:focus-visible {
  top: 8px;
  outline: 3px solid #fff;
  outline-offset: 2px;
}

.orb {
  position: fixed;
  z-index: 0;
  pointer-events: none;
  filter: blur(44px);
  opacity: 0.5;
}

.workspace-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 18px;
}

.workspace-meta h2 {
  margin: 2px 0 4px;
  font-size: clamp(20px, 4vw, 28px);
  color: #102a6a;
}

.workspace-meta p {
  margin: 0;
  color: #4b5f89;
}

.workspace-kicker {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: #1d4ed8;
  font-weight: 700;
}

.workspace-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.settings-btn {
  border-radius: 999px;
  border-color: rgba(59, 130, 246, 0.35);
  background: linear-gradient(135deg, rgba(241, 245, 255, 0.95) 0%, rgba(236, 254, 255, 0.92) 100%);
  color: #1d4ed8;
  font-weight: 600;
}

.settings-btn:hover {
  border-color: #60a5fa;
  color: #1e40af;
}

.orb-left {
  left: -50px;
  top: -50px;
  width: 240px;
  height: 240px;
  background: #3b82f6;
}

.orb-right {
  top: 120px;
  right: -40px;
  width: 260px;
  height: 260px;
  background: #06b6d4;
}

.orb-bottom {
  bottom: -90px;
  left: 30%;
  width: 320px;
  height: 320px;
  background: #22d3ee;
}

.panel,
.hero-card {
  position: relative;
  z-index: 1;
  width: min(1160px, 100%);
  margin: 0 auto 16px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: var(--panel);
  box-shadow:
    0 18px 42px rgba(30, 64, 175, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.74);
  backdrop-filter: blur(14px);
  overflow: clip;
}

.panel::before,
.hero-card::before {
  content: "";
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, #1d4ed8 0%, #0ea5e9 55%, #22d3ee 100%);
  opacity: 0.88;
}

.hero-card {
  padding: 22px;
  display: grid;
  gap: 14px;
  grid-template-columns: 1.35fr 1fr;
}

.hero-kicker {
  margin: 0;
  color: #1d4ed8;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.hero-title h1 {
  margin: 8px 0 12px;
  font-size: clamp(32px, 5.4vw, 56px);
  line-height: 1.04;
  letter-spacing: 0.01em;
  text-wrap: balance;
  font-family:
    "Source Han Serif SC",
    "STZhongsong",
    "Songti SC",
    serif;
  color: #0b1a3f;
}

.hero-desc {
  margin: 0;
  max-width: 62ch;
  color: var(--text-2);
  line-height: 1.8;
}

.hero-pill-row {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  color: #1e3a8a;
  background: rgba(219, 234, 254, 0.8);
  border: 1px solid rgba(147, 197, 253, 0.72);
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
  border: 1px solid rgba(96, 165, 250, 0.42);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.97) 0%, rgba(232, 246, 255, 0.76) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.metric-item span {
  display: block;
  margin-bottom: 4px;
  color: #4f6684;
  font-size: 13px;
}

.metric-item strong {
  font-size: 24px;
  font-variant-numeric: tabular-nums;
  color: #0f2b6d;
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

.create-card-actions {
  margin-top: 12px;
}

.summary {
  margin: 14px 0 8px;
  color: #1e3a8a;
  font-variant-numeric: tabular-nums;
}

.live {
  margin: 0;
  color: #0f766e;
}

.table-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

:deep(.workspace-toolbar .ant-tag) {
  border-radius: 999px;
  padding-inline: 10px;
}

:deep(.ant-card-head) {
  border-bottom: 1px solid rgba(191, 219, 254, 0.58);
}

:deep(.ant-card-head-title) {
  font-size: 20px;
  font-weight: 700;
  color: #102a6a;
}

:deep(.ant-form),
:deep(.ant-form-item),
:deep(.ant-form-item-control),
:deep(.ant-form-item-control-input),
:deep(.ant-form-item-control-input-content) {
  width: 100%;
}

:deep(.ant-input),
:deep(.ant-input-affix-wrapper),
:deep(.ant-input-password),
:deep(.ant-select),
:deep(.ant-select-selector) {
  width: 100%;
  box-sizing: border-box;
  border-radius: 12px !important;
  border-color: #bfdbfe !important;
  background: rgba(248, 250, 255, 0.92) !important;
}

:deep(.ant-input-affix-wrapper .ant-input),
:deep(.ant-input-password .ant-input),
:deep(.ant-select-selector) {
  width: 100%;
}

:deep(.ant-btn) {
  transition:
    transform 140ms ease,
    box-shadow 140ms ease,
    background-color 140ms ease,
    border-color 140ms ease,
    color 140ms ease;
}

:deep(.ant-btn-primary) {
  border: none;
  background: linear-gradient(135deg, #1e40af 0%, #2563eb 48%, #06b6d4 100%);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.34);
}

:deep(.ant-btn-primary:hover) {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(30, 64, 175, 0.34);
}

:deep(.ant-btn:not(.ant-btn-primary):hover) {
  transform: translateY(-1px);
  border-color: #93c5fd;
  color: #1d4ed8;
}

:deep(.ant-tag) {
  border-radius: 999px;
  padding-inline: 10px;
}

:deep(.ant-dropdown-menu) {
  border-radius: 12px;
  padding: 6px;
  border: 1px solid rgba(147, 197, 253, 0.56);
  box-shadow: 0 12px 28px rgba(30, 64, 175, 0.18);
}

:deep(.ant-dropdown-menu-item) {
  border-radius: 8px;
}

:deep(.ant-input:focus-visible),
:deep(.ant-btn:focus-visible),
:deep(.ant-select-selector:focus-visible) {
  outline: 3px solid rgba(37, 99, 235, 0.28);
  outline-offset: 2px;
}

@media (max-width: 980px) {
  .workspace-toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

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
    font-size: clamp(30px, 10vw, 44px);
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
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    transform: none !important;
  }
}
</style>
