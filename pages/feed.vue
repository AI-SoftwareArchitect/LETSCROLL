<script setup>
import { ref, onMounted, onUnmounted } from "vue"

const username = ref("")
const videos = ref([])
const currentIndex = ref(0)
const likedVideos = ref(new Set())
const loading = ref(true)
const isMuted = ref(true) // video başta sessiz başlar

// Videoları yükle
const loadVideos = async () => {
  try {
    const res = await fetch(`http://localhost:3001/api/videos/${username.value}`)
    const data = await res.json()
    videos.value = data
  } catch (err) {
    console.error("Video yükleme hatası:", err)
  } finally {
    loading.value = false
  }
}

// Video beğenme
const toggleLike = async (videoId) => {
  try {
    await fetch("http://localhost:3001/api/interact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.value,
        videoId,
        action: "like",
        watchTime: Math.floor(Math.random() * 100),
      }),
    })
    likedVideos.value.has(videoId)
      ? likedVideos.value.delete(videoId)
      : likedVideos.value.add(videoId)
  } catch (e) {
    console.error("Beğenme hatası:", e)
  }
}

// Video yüklendiğinde view sayısını artır
const onVideoLoad = async (videoId) => {
  try {
    await fetch("http://localhost:3001/api/interact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.value,
        videoId,
        action: "view",
        watchTime: 0,
      }),
    })
  } catch (e) {
    console.error("View hatası:", e)
  }
}

// Video geçişleri
const nextVideo = () => {
  if (currentIndex.value < videos.value.length - 1) currentIndex.value++
}
const prevVideo = () => {
  if (currentIndex.value > 0) currentIndex.value--
}

// Scroll / arrow ile geçiş
const handleScroll = (e) => {
  if (e.deltaY > 0 || e.key === "ArrowDown") nextVideo()
  if (e.deltaY < 0 || e.key === "ArrowUp") prevVideo()
}

// Ses aç/kapat toggle
const toggleMute = () => {
  isMuted.value = !isMuted.value
}

onMounted(() => {
  username.value = localStorage.getItem("username") || "guest"
  loadVideos()
  window.addEventListener("wheel", handleScroll, { passive: true })
  window.addEventListener("keydown", handleScroll)
})

onUnmounted(() => {
  window.removeEventListener("wheel", handleScroll)
  window.removeEventListener("keydown", handleScroll)
})
</script>

<template>
  <div class="app">
    <div v-if="loading" class="loading">Videolar yükleniyor...</div>

    <div v-else-if="videos.length" class="video-wrapper">
      <transition name="fade" mode="out-in">
        <div
          :key="videos[currentIndex].id"
          class="video-card"
        >
          <video
            ref="currentVideo"
            :src="`http://localhost:3001/videos/${videos[currentIndex].filename}`"
            class="video"
            autoplay
            :muted="isMuted"
            loop
            playsinline
            @loadeddata="onVideoLoad(videos[currentIndex].id)"
          />
          <div class="video-controls">
            <button
              :class="['heart-button', { liked: likedVideos.has(videos[currentIndex].id) }]"
              @click="toggleLike(videos[currentIndex].id)"
            >
              ❤️
            </button>
            <button
              class="mute-button"
              @click="toggleMute"
            >
              {{ isMuted ? "🔇" : "🔊" }}
            </button>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Inter", sans-serif;
}

.loading {
  color: #22c55e;
  font-size: 20px;
}

.video-wrapper {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-card {
  position: relative;
  background: #111;
  border-radius: 18px;
  overflow: hidden;
  width: 400px;
  height: 800px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 28px rgba(197, 197, 197, 0.5);
  transition: transform 0.3s ease;
}

.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 15px;
}

.heart-button, .mute-button {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 50%;
  width: 55px;
  height: 55px;
  font-size: 26px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.25s;
}

.heart-button:hover, .mute-button:hover {
  transform: scale(1.1);
  background: #ef4444;
}

.heart-button.liked {
  background: #ef4444;
  color: white;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
