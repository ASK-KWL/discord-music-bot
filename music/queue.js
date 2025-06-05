const { AudioPlayerStatus } = require('@discordjs/voice');
const { createYouTubePlayerWithProcessing, createPlayer } = require('./player');

class MusicQueue {
  constructor() {
    this.queues = new Map();
    this.inactivityTimeouts = new Map(); // Track inactivity timeouts
  }

  getQueue(guildId) {
    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, {
        songs: [],
        isPlaying: false,
        connection: null,
        player: null,
        currentSong: null,
        volume: 0.8,
        guildId: guildId
      });
    }
    return this.queues.get(guildId);
  }

  async addSong(guildId, song) {
    const queue = this.getQueue(guildId);
    queue.songs.push(song);
    return queue.songs.length;
  }

  startInactivityTimer(guildId, textChannel) {
    // Clear existing timeout if any
    this.clearInactivityTimer(guildId);
    
    console.log(`Starting 3-minute inactivity timer for guild ${guildId}`);
    const timeout = setTimeout(() => {
      const queue = this.getQueue(guildId);
      if (!queue.isPlaying && queue.songs.length === 0) {
        textChannel.send('💤 **Leaving due to inactivity** (3 minutes with no music)');
        this.stop(guildId);
      }
    }, 3 * 60 * 1000); // 3 minutes
    
    this.inactivityTimeouts.set(guildId, timeout);
  }

  clearInactivityTimer(guildId) {
    const timeout = this.inactivityTimeouts.get(guildId);
    if (timeout) {
      clearTimeout(timeout);
      this.inactivityTimeouts.delete(guildId);
      console.log(`Cleared inactivity timer for guild ${guildId}`);
    }
  }

  async play(guildId, connection, textChannel) {
    const queue = this.getQueue(guildId);
    
    // Clear inactivity timer since we're about to play
    this.clearInactivityTimer(guildId);
    
    if (!queue.songs.length) {
      queue.isPlaying = false;
      this.startInactivityTimer(guildId, textChannel);
      return;
    }

    if (queue.isPlaying) {
      return;
    }

    queue.isPlaying = true;
    queue.connection = connection;
    queue.currentSong = queue.songs.shift();

    try {
      await this.playSong(queue, textChannel);
    } catch (error) {
      console.error('Error playing song:', error);
      textChannel.send(`❌ Error playing **${queue.currentSong.title}**: ${error.message}`);
      await this.playNext(guildId, textChannel);
    }
  }

  async playSong(queue, textChannel) {
    try {
      textChannel.send(`🎵 **Now Playing:** ${queue.currentSong.title}`);
      
      let playerData;
      try {
        playerData = await createYouTubePlayerWithProcessing(queue.currentSong.url);
      } catch (processedError) {
        console.log('Processed method failed, trying direct method');
        playerData = await createPlayer(queue.currentSong.url);
      }

      const { player, resource } = playerData;
      queue.player = player;

      if (resource.volume) {
        resource.volume.setVolume(queue.volume);
      }

      player.on('stateChange', async (oldState, newState) => {
        console.log(`Player: ${oldState.status} -> ${newState.status}`);
        
        if (newState.status === AudioPlayerStatus.Idle && oldState.status === AudioPlayerStatus.Playing) {
          await this.playNext(queue.guildId, textChannel);
        }
      });

      player.on('error', async (error) => {
        console.error('Player error:', error);
        textChannel.send(`❌ Playback error: ${error.message}`);
        await this.playNext(queue.guildId, textChannel);
      });

      queue.connection.subscribe(player);
      player.play(resource);

    } catch (error) {
      throw error;
    }
  }

  async playNext(guildId, textChannel) {
    const queue = this.getQueue(guildId);
    
    if (queue.songs.length === 0) {
      queue.isPlaying = false;
      queue.currentSong = null;
      textChannel.send('✅ Queue finished!');
      
      // Start inactivity timer instead of immediate disconnect
      this.startInactivityTimer(guildId, textChannel);
      return;
    }

    queue.currentSong = queue.songs.shift();
    try {
      await this.playSong(queue, textChannel);
    } catch (error) {
      console.error('Error playing next song:', error);
      textChannel.send(`❌ Error playing next song: ${error.message}`);
      await this.playNext(guildId, textChannel);
    }
  }

  skip(guildId, textChannel) {
    const queue = this.getQueue(guildId);
    
    if (!queue.current && queue.songs.length === 0) {
      // No current song and no queue - just clear and start timer
      this.clearQueue(guildId);
      if (textChannel) {
        textChannel.send('❌ Nothing in queue to skip!');
        this.startInactivityTimer(guildId, textChannel);
      }
      return false;
    }
    
    if (!queue.current) {
      // No current song but has queue - this shouldn't happen, but handle it
      if (textChannel) {
        textChannel.send('❌ Nothing currently playing!');
      }
      return false;
    }
    
    if (queue.player && queue.player.state.status === AudioPlayerStatus.Playing) {
      // Clear inactivity timer since we're skipping to next song
      this.clearInactivityTimer(guildId);
      queue.player.stop();
      return true;
    }
    
    return false;
  }

  stop(guildId) {
    const queue = this.getQueue(guildId);
    
    // Clear inactivity timer
    this.clearInactivityTimer(guildId);
    
    // Clear queue
    queue.songs = [];
    queue.currentSong = null;
    
    if (queue.player) {
      queue.player.stop();
    }
    if (queue.connection && queue.connection.state.status !== 'destroyed') {
      queue.connection.destroy();
    }
    this.queues.delete(guildId);
  }

  clearQueue(guildId) {
    const queue = this.getQueue(guildId);
    queue.songs = [];
    
    if (!queue.isPlaying) {
      queue.currentSong = null;
    }
  }

  getQueueList(guildId) {
    const queue = this.getQueue(guildId);
    return {
      current: queue.currentSong,
      queue: queue.songs,
      isPlaying: queue.isPlaying
    };
  }
}

module.exports = new MusicQueue();
