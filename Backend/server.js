const express = require('express');
const cors = require('cors');
const brain = require('brain.js');
const Datastore = require('nedb');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/videos', express.static('shorties'));

// Veritabanları
const usersDb = new Datastore({ filename: 'data/users.db', autoload: true });
const videosDb = new Datastore({ filename: 'data/videos.db', autoload: true });
const interactionsDb = new Datastore({ filename: 'data/interactions.db', autoload: true });

// Brain.js neural network
const net = new brain.NeuralNetwork();
let isModelTrained = false;

// Videoları yükle
function loadVideos() {
  const videoFiles = fs.readdirSync('shorties').filter(file => file.endsWith('.mp4'));
  
  videoFiles.forEach(file => {
    const videoId = path.basename(file, '.mp4');
    videosDb.findOne({ id: videoId }, (err, doc) => {
      if (!doc) {
        videosDb.insert({
          id: videoId,
          filename: file,
          likes: 0,
          views: 0
        });
      }
    });
  });
}

// Modeli eğit
function trainModel() {
  interactionsDb.find({}, (err, interactions) => {
    if (interactions.length > 10) {
      const trainingData = interactions.map(interaction => ({
        input: {
          watchTime: interaction.watchTime / 100, // normalize
          liked: interaction.liked ? 1 : 0,
          skipped: interaction.skipped ? 1 : 0
        },
        output: { preference: interaction.liked ? 1 : 0.1 }
      }));

      net.train(trainingData, {
        iterations: 1000,
        errorThresh: 0.005,
      });
      isModelTrained = true;
    }
  });
}

// Routes
app.post('/api/login', (req, res) => {
  const { username } = req.body;
  
  usersDb.findOne({ username }, (err, user) => {
    if (user) {
      res.json({ success: true, user });
    } else {
      usersDb.insert({ username, createdAt: new Date() }, (err, newUser) => {
        res.json({ success: true, user: newUser });
      });
    }
  });
});

app.get('/api/videos/:username', (req, res) => {
  const { username } = req.params;
  
  videosDb.find({}, (err, videos) => {
    if (err) return res.status(500).json({ error: err });
    
    // Basit öneri sistemi - beğenilere göre sıralama
    interactionsDb.find({ username }, (err, userInteractions) => {
      let sortedVideos = [...videos];
      
      if (isModelTrained && userInteractions.length > 0) {
        // AI ile öneriler
        sortedVideos = videos.map(video => {
          const userInteraction = userInteractions.find(i => i.videoId === video.id);
          if (userInteraction) {
            const prediction = net.run({
              watchTime: userInteraction.watchTime / 100,
              liked: userInteraction.liked ? 1 : 0,
              skipped: userInteraction.skipped ? 1 : 0
            });
            return { ...video, score: prediction.preference };
          }
          return { ...video, score: Math.random() };
        }).sort((a, b) => b.score - a.score);
      } else {
        // Basit sıralama: beğenilere göre + rastgele
        sortedVideos.sort((a, b) => b.likes - a.likes + (Math.random() - 0.5));
      }
      
      res.json(sortedVideos);
    });
  });
});

app.post('/api/interact', (req, res) => {
  const { username, videoId, action, watchTime } = req.body;
  
  const interaction = {
    username,
    videoId,
    action,
    watchTime: watchTime || 0,
    liked: action === 'like',
    skipped: action === 'skip',
    timestamp: new Date()
  };
  
  interactionsDb.insert(interaction);
  
  if (action === 'like') {
    videosDb.update({ id: videoId }, { $inc: { likes: 1 } });
  }
  
  videosDb.update({ id: videoId }, { $inc: { views: 1 } });
  
  // Modeli yeniden eğit
  setTimeout(trainModel, 100);
  
  res.json({ success: true });
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
  loadVideos();
  setTimeout(trainModel, 1000);
});
