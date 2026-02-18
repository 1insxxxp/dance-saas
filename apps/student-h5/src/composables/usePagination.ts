import { ref } from "vue";

export function usePagination(initialPage = 1, initialPageSize = 10) {
  const page = ref(initialPage);
  const pageSize = ref(initialPageSize);
  const total = ref(0);

  function handlePageChange(newPage: number) {
    page.value = newPage;
  }

  function resetPage() {
    page.value = 1;
  }

  return {
    page,
    pageSize,
    total,
    handlePageChange,
    resetPage,
  };
}
