import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/style.css'

const app = createApp(App)
app.use(router)
// If a page hits an error, log it instead of leaving a blank screen
app.config.errorHandler = (err, instance, info) => {
  console.error('[app error]', info, err)
}
app.mount('#app')