<template>
  <!-- Placeholder shapes while something loads, so the page doesn't jump when the data arrives.
       variant: 'list' (avatar + two lines per row), 'cards' (a grid of cards), 'page' (a header, tabs and cards) -->
  <div class="lsk" :class="'lsk-' + variant" role="status" aria-busy="true">
    <span class="visually-hidden">{{ label }}</span>

    <template v-if="variant === 'list'">
      <div v-for="n in count" :key="n" class="lsk-row">
        <span class="skel lsk-avatar" :class="{ dark }"></span>
        <span class="lsk-lines">
          <span class="skel lsk-line" :class="{ dark }" :style="{ width: (70 - (n % 3) * 12) + '%' }"></span>
          <span class="skel lsk-line short" :class="{ dark }"></span>
        </span>
      </div>
    </template>

    <div v-else-if="variant === 'cards'" class="lsk-grid">
      <span v-for="n in count" :key="n" class="skel lsk-card" :class="{ dark }"></span>
    </div>

    <template v-else>
      <span class="skel lsk-hero" :class="{ dark }"></span>
      <span class="skel lsk-tabs" :class="{ dark }"></span>
      <div class="lsk-grid">
        <span v-for="n in count" :key="n" class="skel lsk-card" :class="{ dark }"></span>
      </div>
    </template>
  </div>
</template>

<script setup>
defineProps({
  variant: { type: String, default: 'list' }, // 'list' | 'cards' | 'page'
  count: { type: Number, default: 3 },
  dark: { type: Boolean, default: false },
  label: { type: String, default: 'Loading…' }
})
</script>

<style scoped>
.lsk-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
}
.lsk-avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
}
.lsk-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.lsk-line {
  height: 12px;
  border-radius: 6px;
}
.lsk-line.short {
  width: 35%;
}
.lsk-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
.lsk-card {
  height: 180px;
  border-radius: 18px;
}
.lsk-hero {
  height: 220px;
  border-radius: 24px;
  margin-bottom: 16px;
}
.lsk-tabs {
  height: 52px;
  border-radius: 999px;
  margin-bottom: 20px;
}
@media (max-width: 560px) {
  .lsk-hero { height: 160px; }
  .lsk-card { height: 140px; }
}
</style>
