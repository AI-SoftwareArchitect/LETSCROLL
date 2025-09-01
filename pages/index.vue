<script setup>
const username = ref('')
const loading = ref(false)
const router = useRouter()

const login = async () => {
  loading.value = true
  try {
    const response = await fetch('http://localhost:3001/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value })
    })
    const data = await response.json()
    
    if (data.success) {
      localStorage.setItem('username', username.value)
      router.push('/feed')
    }
  } catch (error) {
    console.error('Login hatası:', error)
  }
  loading.value = false
}
</script>
<template>
  <div class="login-container">
    <div class="container">
      <h1 style="text-align: center; margin-bottom: 30px; font-size: 32px;">Video Platform</h1>
      
      <form @submit.prevent="login">
        <div class="input-group">
          <input
            v-model="username"
            type="text"
            placeholder="Kullanıcı adınızı girin"
            class="input"
            required
          />
        </div>
        
        <button type="submit" class="button" :disabled="loading">
          {{ loading ? 'Giriş yapılıyor...' : 'Giriş Yap' }}
        </button>
      </form>
    </div>
  </div>
</template>
