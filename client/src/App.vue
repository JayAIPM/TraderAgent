<template>
  <MainLayout />
</template>

<script setup lang="ts">
import MainLayout from './views/MainLayout.vue'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
