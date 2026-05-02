import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/tokens.css'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/latin-ext-400.css'
import '@fontsource/italianno/400.css'

createApp(App).use(createPinia()).use(router).mount('#app')
