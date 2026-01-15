<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip
)

const props = defineProps({
  data: {
    type: Array,
    required: true, // [{ date, heat }]
  },
  height: {
    type: Number,
    default: 60,
  },
  showLabels: {
    type: Boolean,
    default: false,
  },
  color: {
    type: String,
    default: '#6366f1',
  },
})

const chartData = computed(() => ({
  labels: props.data.map(d => d.date),
  datasets: [
    {
      data: props.data.map(d => d.heat),
      borderColor: props.color,
      backgroundColor: props.color + '33',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      enabled: true,
      backgroundColor: '#1e1e2e',
      titleColor: '#fff',
      bodyColor: '#fff',
      padding: 8,
      displayColors: false,
      callbacks: {
        label: (context) => `Heat: ${context.parsed.y.toFixed(2)}`,
      },
    },
  },
  scales: {
    x: {
      display: props.showLabels,
      grid: { display: false },
      ticks: { color: '#ffffff66' },
    },
    y: {
      display: false,
      min: 0,
      max: 1,
      grid: { display: false },
    },
  },
  interaction: {
    intersect: false,
    mode: 'index',
  },
}))
</script>

<template>
  <div :style="{ height: height + 'px' }">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>
