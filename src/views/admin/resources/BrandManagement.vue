<script setup lang="ts">
// 品牌管理 - 待开发
</script>

<template>
  <a-card :bordered="false">
    <a-result status="info" title="品牌管理" sub-title="该功能正在开发中，敬请期待...">
      <template #extra>
        <a-button type="primary" @click="$router.push('/admin/dashboard')">返回首页</a-button>
      </template>
    </a-result>
  </a-card>
</template>

<style scoped></style>