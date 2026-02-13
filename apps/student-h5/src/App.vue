<script setup lang="ts">
import { onMounted, ref } from 'vue'

const message = ref('加载中...')

onMounted(async () => {
  const res = await fetch('http://localhost:3100/api/courses')
  const data = await res.json()
  message.value = data
})
</script>

<template>
  <div>
    <h1>学生端</h1>
    <p>{{ message }}</p>
  </div>
</template>
