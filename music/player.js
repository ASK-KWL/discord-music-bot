const { createAudioPlayer, createAudioResource, joinVoiceChannel, StreamType } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');

function createAudioConnection(message) {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) throw new Error('Join a voice channel first.');

  console.log(`Creating voice connection to channel: ${voiceChannel.id}`);
  return joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: message.guild.id,
    adapterCreator: message.guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false,
  });
}

async function createPlayer(url) {
  console.log('Creating YouTube player with tested method...');
  
  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: 'play',
    }
  });

  try {
    // Use the same approach that worked for FFmpeg
    const stream = ytdl(url, {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25,
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    });

    // Use the same StreamType that worked for streamtest
    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
      inlineVolume: true,
      metadata: {
        title: 'YouTube Audio',
        url: url
      }
    });

    if (resource.volume) {
      resource.volume.setVolume(0.8);
    }

    // Add the same error handling that worked
    stream.on('error', (error) => {
      console.error('YouTube stream error:', error);
    });

    resource.playStream.on('error', (error) => {
      console.error('YouTube playStream error:', error);
    });

    console.log('✅ YouTube audio resource created with tested method');
    return { player, resource };
    
  } catch (error) {
    console.error('❌ Error creating YouTube player:', error);
    throw new Error(`Failed to create YouTube player: ${error.message}`);
  }
}

// Add a new function that processes YouTube audio like our successful tests
async function createYouTubePlayerWithProcessing(url) {
  console.log('Creating processed YouTube player...');
  
  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: 'play',
    }
  });

  try {
    // Get raw YouTube stream with better error handling
    const ytStream = ytdl(url, {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25,
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    });

    // Process the stream similar to how streamtest worked
    const { spawn } = require('child_process');

    // Use FFmpeg to process YouTube audio to the same format that worked
    const ffmpeg = spawn('ffmpeg', [
      '-i', 'pipe:0',        // Input from pipe
      '-ac', '2',            // Stereo (like our working tests)
      '-ar', '48000',        // 48kHz (Discord preferred)
      '-f', 's16le',         // Same format as working tests
      '-reconnect', '1',     // Enable reconnection
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '5',
      '-'                    // Output to pipe
    ]);

    // Better error handling for streams
    ytStream.on('error', (error) => {
      console.error('YouTube stream error:', error);
      ffmpeg.stdin.destroy();
    });

    ffmpeg.stdin.on('error', (error) => {
      if (error.code !== 'EPIPE') {
        console.error('FFmpeg stdin error:', error);
      }
    });

    ffmpeg.stderr.on('data', (data) => {
      console.log('FFmpeg stderr:', data.toString());
    });

    // Pipe YouTube stream through FFmpeg
    ytStream.pipe(ffmpeg.stdin);

    const resource = createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.Raw,
      inlineVolume: true,
      metadata: {
        title: 'Processed YouTube Audio',
        url: url
      }
    });

    // Handle errors
    ffmpeg.on('error', (error) => {
      console.error('FFmpeg processing error:', error);
    });

    console.log('✅ Processed YouTube audio resource created');
    return { player, resource };
    
  } catch (error) {
    console.error('❌ Error creating processed YouTube player:', error);
    throw error;
  }
}

async function createSimplePlayer(audioUrl) {
  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: 'play',
    }
  });

  const resource = createAudioResource(audioUrl, {
    inlineVolume: true
  });

  if (resource.volume) {
    resource.volume.setVolume(1.0);
  }

  return { player, resource };
}

async function getSongInfo(url) {
  try {
    const info = await ytdl.getInfo(url);
    return {
      title: info.videoDetails.title || 'Unknown Title',
      duration: parseInt(info.videoDetails.lengthSeconds) || 0,
      uploader: info.videoDetails.author.name || 'Unknown',
      thumbnail: info.videoDetails.thumbnails[0]?.url || null
    };
  } catch (error) {
    console.error('Error getting song info:', error);
    return {
      title: 'YouTube Audio',
      duration: 0,
      uploader: 'Unknown',
      thumbnail: null
    };
  }
}

function isPlaylist(url) {
  return url.includes('playlist?list=') || url.includes('&list=');
}

module.exports = { 
  createAudioConnection, 
  createPlayer,
  createYouTubePlayerWithProcessing,
  createSimplePlayer,
  getSongInfo,
  isPlaylist
};