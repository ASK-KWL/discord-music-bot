const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const queues = {};

function formatDuration(seconds) {
  if (!seconds || seconds === 0) return 'Unknown';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

function getQueueList(guildId) {
  if (!queues[guildId]) {
    queues[guildId] = {
      queue: [],
      current: null,
      isPlaying: false,
      volume: 0.8,
      loopMode: 'off', // 'off', 'song', 'queue'
      connection: null,
      channel: null,
      player: null,
      inactivityTimer: null,
      nowPlayingMessage: null
    };
  }
  return queues[guildId];
}

function play(guildId, song, player, resource, connection, channel) {
  console.log(`Queue play called for guild: ${guildId}, song: ${song.title}`);
  
  const queue = getQueueList(guildId);
  queue.current = song;
  queue.connection = connection;
  queue.channel = channel;
  queue.player = player;
  queue.isPlaying = true;

  // Set up player event handlers
  player.on('stateChange', async (oldState, newState) => {
    console.log(`Queue Player state: ${oldState.status} -> ${newState.status}`);
    
    if (newState.status === 'playing') {
      queue.isPlaying = true;
      resetInactivityTimer(guildId);
      
      // Send now playing message with buttons
      await sendNowPlayingMessage(guildId, song);
    } else if (newState.status === 'idle') {
      if (oldState.status === 'playing') {
        // Song finished, play next
        console.log('Song finished, playing next...');
        queue.isPlaying = false;
        playNext(guildId);
      }
    }
  });

  player.on('error', (error) => {
    console.error('Queue player error:', error);
    queue.isPlaying = false;
    if (channel) {
      channel.send(`❌ **Playback error:** ${error.message}`);
    }
    playNext(guildId);
  });

  // Subscribe and start playing
  connection.subscribe(player);
  player.play(resource);

  console.log(`✅ Queue started playing: ${song.title}`);
}

function toggleLoop(guildId) {
  const queue = getQueueList(guildId);
  
  // Cycle through: off -> song -> queue -> off
  switch (queue.loopMode) {
    case 'off':
      queue.loopMode = 'song';
      break;
    case 'song':
      queue.loopMode = 'queue';
      break;
    case 'queue':
      queue.loopMode = 'off';
      break;
    default:
      queue.loopMode = 'off';
  }
  
  console.log(`Loop mode changed to: ${queue.loopMode} for guild: ${guildId}`);
  return queue.loopMode;
}

function setLoopMode(guildId, mode) {
  const queue = getQueueList(guildId);
  const validModes = ['off', 'song', 'queue'];
  
  if (validModes.includes(mode)) {
    queue.loopMode = mode;
    console.log(`Loop mode set to: ${mode} for guild: ${guildId}`);
  }
  
  return queue.loopMode;
}

function getLoopModeEmoji(mode) {
  switch (mode) {
    case 'song': return '🔂';
    case 'queue': return '🔁';
    default: return '🔄';
  }
}

function getLoopModeText(mode) {
  switch (mode) {
    case 'song': return 'Song';
    case 'queue': return 'Queue';
    default: return 'Off';
  }
}

async function sendNowPlayingMessage(guildId, song) {
  const queue = queues[guildId];
  if (!queue || !queue.channel) return;

  try {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🎵 Now Playing')
      .setDescription(`**${song.title}**`)
      .addFields(
        { name: '👤 Requested by', value: song.requestedBy, inline: true },
        { name: '📺 Channel', value: song.uploader || 'Unknown', inline: true },
        { name: '⏱️ Duration', value: formatDuration(song.duration), inline: true },
        { name: '🔄 Loop Mode', value: getLoopModeText(queue.loopMode), inline: true },
        { name: '📋 Queue Length', value: `${queue.queue.length} songs`, inline: true },
        { name: '🎚️ Status', value: queue.isPlaying ? 'Playing' : 'Paused', inline: true }
      )
      .setFooter({ text: 'Music Bot Player • Use !cleanup to remove bot messages' })
      .setTimestamp();

    if (song.thumbnail) {
      embed.setThumbnail(song.thumbnail);
    }

    // Single row of buttons - cleaner layout
    const controlRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`music_playpause_${guildId}`)
          .setLabel(queue.isPlaying ? 'Pause' : 'Resume')
          .setStyle(ButtonStyle.Primary)
          .setEmoji(queue.isPlaying ? '⏸️' : '▶️'),
        
        new ButtonBuilder()
          .setCustomId(`music_skip_${guildId}`)
          .setLabel('Skip')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⏭️'),
        
        new ButtonBuilder()
          .setCustomId(`music_loop_${guildId}`)
          .setLabel(`${getLoopModeText(queue.loopMode)}`)
          .setStyle(queue.loopMode !== 'off' ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setEmoji(getLoopModeEmoji(queue.loopMode)),
        
        new ButtonBuilder()
          .setCustomId(`music_queue_${guildId}`)
          .setLabel('Queue')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📋'),
        
        new ButtonBuilder()
          .setCustomId(`music_stop_${guildId}`)
          .setLabel('Stop')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('⏹️')
      );

    // Delete old now playing message
    if (queue.nowPlayingMessage) {
      try {
        await queue.nowPlayingMessage.delete();
      } catch (error) {
        console.log('Could not delete old now playing message');
      }
    }

    // Send new now playing message with single row
    queue.nowPlayingMessage = await queue.channel.send({
      content: '🎵 **Music Player**',
      embeds: [embed],
      components: [controlRow]
    });

  } catch (error) {
    console.error('Error sending now playing message:', error);
  }
}

function addToQueue(guildId, song) {
  const queue = getQueueList(guildId);
  queue.queue.push(song);
  console.log(`Added to queue: ${song.title} (position ${queue.queue.length})`);
}

function shuffleQueue(guildId) {
  const queue = getQueueList(guildId);
  
  if (queue.queue.length <= 1) {
    return false;
  }
  
  // Fisher-Yates shuffle algorithm
  for (let i = queue.queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue.queue[i], queue.queue[j]] = [queue.queue[j], queue.queue[i]];
  }
  
  console.log(`Shuffled queue for guild: ${guildId} (${queue.queue.length} songs)`);
  return true;
}

function playNext(guildId) {
  const queue = getQueueList(guildId);
  
  // Handle loop modes
  if (queue.loopMode === 'song' && queue.current) {
    console.log(`Song loop enabled, replaying: ${queue.current.title}`);
    
    setTimeout(async () => {
      try {
        const { createYouTubePlayerWithProcessing } = require('./player');
        const { player, resource } = await createYouTubePlayerWithProcessing(queue.current.url);
        
        play(guildId, queue.current, player, resource, queue.connection, queue.channel);
      } catch (error) {
        console.error('Error replaying looped song:', error);
        queue.channel.send(`❌ **Failed to replay:** ${queue.current.title}`);
        // Disable loop and try next song
        queue.loopMode = 'off';
        playNext(guildId);
      }
    }, 1000);
    
    return true;
  }
  
  if (queue.queue.length === 0) {
    // No songs in queue
    if (queue.loopMode === 'queue' && queue.current) {
      // Queue loop with only current song - replay it
      console.log('Queue loop enabled, but queue empty - replaying current song');
      setTimeout(async () => {
        try {
          const { createYouTubePlayerWithProcessing } = require('./player');
          const { player, resource } = await createYouTubePlayerWithProcessing(queue.current.url);
          
          play(guildId, queue.current, player, resource, queue.connection, queue.channel);
        } catch (error) {
          console.error('Error replaying in queue loop:', error);
          stop(guildId);
        }
      }, 1000);
      return true;
    } else {
      console.log('Queue is empty, stopping playback');
      stop(guildId);
      return false;
    }
  }

  const nextSong = queue.queue.shift();
  console.log(`Playing next song: ${nextSong.title}`);
  
  // If queue loop is enabled, add current song back to end of queue
  if (queue.loopMode === 'queue' && queue.current) {
    queue.queue.push(queue.current);
    console.log(`Queue loop: Added ${queue.current.title} back to end of queue`);
  }
  
  // Create new player for next song
  setTimeout(async () => {
    try {
      const { createYouTubePlayerWithProcessing } = require('./player');
      const { player, resource } = await createYouTubePlayerWithProcessing(nextSong.url);
      
      play(guildId, nextSong, player, resource, queue.connection, queue.channel);
    } catch (error) {
      console.error('Error playing next song:', error);
      queue.channel.send(`❌ **Failed to play next song:** ${nextSong.title}`);
      playNext(guildId); // Try the next song
    }
  }, 1000);
  
  return true;
}

function stop(guildId) {
  const queue = getQueueList(guildId);
  
  queue.queue = [];
  queue.current = null;
  queue.isPlaying = false;
  
  if (queue.player) {
    queue.player.stop();
  }
  
  if (queue.connection) {
    queue.connection.destroy();
  }
  
  // Delete the now playing message when stopping
  if (queue.nowPlayingMessage) {
    setTimeout(async () => {
      try {
        await queue.nowPlayingMessage.delete();
        queue.nowPlayingMessage = null;
      } catch (error) {
        console.log('Could not delete now playing message on stop');
      }
    }, 3000); // 3 second delay before deletion
  }
  
  clearInactivityTimer(guildId);
  console.log(`Stopped and cleared queue for guild: ${guildId}`);
}

function skip(guildId, channel) {
  const queue = getQueueList(guildId);
  
  if (!queue.current) {
    return false;
  }
  
  console.log(`Skipping: ${queue.current.title}`);
  
  if (queue.player) {
    queue.player.stop(); // This will trigger the 'idle' event and play next
  }
  
  return true;
}

function pause(guildId) {
  const queue = getQueueList(guildId);
  
  if (queue.player && queue.isPlaying) {
    queue.player.pause();
    queue.isPlaying = false;
    console.log('Paused playback');
  }
}

function resume(guildId) {
  const queue = getQueueList(guildId);
  
  if (queue.player && !queue.isPlaying) {
    queue.player.unpause();
    queue.isPlaying = true;
    console.log('Resumed playback');
  }
}

function setVolume(guildId, volume) {
  const queue = getQueueList(guildId);
  queue.volume = volume;
  
  if (queue.player && queue.player.resource && queue.player.resource.volume) {
    queue.player.resource.volume.setVolume(volume);
  }
}

function resetInactivityTimer(guildId) {
  clearInactivityTimer(guildId);
  
  const queue = getQueueList(guildId);
  console.log(`Starting 3-minute inactivity timer for guild ${guildId}`);
  
  queue.inactivityTimer = setTimeout(() => {
    console.log(`Inactivity timeout reached for guild ${guildId}`);
    if (queue.channel) {
      queue.channel.send('🕐 **Disconnected due to 3 minutes of inactivity.**');
    }
    stop(guildId);
  }, 3 * 60 * 1000); // 3 minutes
}

function clearInactivityTimer(guildId) {
  const queue = getQueueList(guildId);
  if (queue.inactivityTimer) {
    clearTimeout(queue.inactivityTimer);
    queue.inactivityTimer = null;
  }
}

async function updateNowPlayingMessage(guildId, isPlaying) {
  const queue = getQueueList(guildId);
  if (!queue || !queue.channel || !queue.nowPlayingMessage || !queue.current) return;

  try {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🎵 Now Playing')
      .setDescription(`**${queue.current.title}**`)
      .addFields(
        { name: '👤 Requested by', value: queue.current.requestedBy, inline: true },
        { name: '📺 Channel', value: queue.current.uploader || 'Unknown', inline: true },
        { name: '⏱️ Duration', value: formatDuration(queue.current.duration), inline: true },
        { name: '🔄 Loop Mode', value: getLoopModeText(queue.loopMode), inline: true },
        { name: '📋 Queue Length', value: `${queue.queue.length} songs`, inline: true },
        { name: '🎚️ Status', value: queue.isPlaying ? 'Playing' : 'Paused', inline: true }
      )
      .setFooter({ text: 'Music Bot Player • Use !cleanup to remove bot messages' })
      .setTimestamp();

    if (queue.current.thumbnail) {
      embed.setThumbnail(queue.current.thumbnail);
    }

    // Single row of buttons - Updated in real-time
    const controlRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`music_playpause_${guildId}`)
          .setLabel(queue.isPlaying ? 'Pause' : 'Resume')
          .setStyle(ButtonStyle.Primary)
          .setEmoji(queue.isPlaying ? '⏸️' : '▶️'),
        
        new ButtonBuilder()
          .setCustomId(`music_skip_${guildId}`)
          .setLabel('Skip')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⏭️'),
        
        new ButtonBuilder()
          .setCustomId(`music_loop_${guildId}`)
          .setLabel(`${getLoopModeText(queue.loopMode)}`)
          .setStyle(queue.loopMode !== 'off' ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setEmoji(getLoopModeEmoji(queue.loopMode)),
        
        new ButtonBuilder()
          .setCustomId(`music_queue_${guildId}`)
          .setLabel('Queue')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📋'),
        
        new ButtonBuilder()
          .setCustomId(`music_stop_${guildId}`)
          .setLabel('Stop')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('⏹️')
      );

    // Update the existing message
    await queue.nowPlayingMessage.edit({
      content: '🎵 **Music Player**',
      embeds: [embed],
      components: [controlRow]
    });

    console.log(`Updated now playing message for guild: ${guildId}`);

  } catch (error) {
    console.error('Error updating now playing message:', error);
  }
}

module.exports = {
  getQueueList,
  play,
  addToQueue,
  playNext,
  stop,
  skip,
  pause,
  resume,
  setVolume,
  toggleLoop,
  setLoopMode,
  resetInactivityTimer,
  clearInactivityTimer,
  updateNowPlayingMessage
};
