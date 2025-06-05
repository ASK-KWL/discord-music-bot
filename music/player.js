const { createAudioPlayer, createAudioResource, joinVoiceChannel, StreamType } = require('@discordjs/voice');

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
  console.log('Creating YouTube player (yt-dlp primary method)...');
  
  // Use yt-dlp as the primary and only method since it's working
  try {
    return await createYouTubePlayerWithProcessing(url);
  } catch (ytdlpError) {
    console.error('❌ yt-dlp method failed:', ytdlpError);
    throw new Error(`YouTube player creation failed: ${ytdlpError.message}`);
  }
}

async function createYouTubePlayerWithProcessing(url) {
  console.log('Creating YouTube player with yt-dlp/FFmpeg...');
  
  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: 'play',
      maxMissedFrames: Math.round(5000 / 20),
    }
  });

  try {
    const { spawn } = require('child_process');
    
    // Try different yt-dlp commands
    const ytdlpCommands = [
      'yt-dlp',
      'yt-dlp.exe',
      'python -m yt_dlp',
      'python3 -m yt_dlp'
    ];
    
    let ytdlpCmd = null;
    
    // Test which yt-dlp command works
    for (const cmd of ytdlpCommands) {
      try {
        console.log(`Testing command: ${cmd}`);
        const testProcess = spawn(cmd.split(' ')[0], [...cmd.split(' ').slice(1), '--version'], { 
          stdio: 'pipe',
          shell: true 
        });
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('timeout')), 3000);
          testProcess.on('close', (code) => {
            clearTimeout(timeout);
            if (code === 0) {
              ytdlpCmd = cmd;
              resolve();
            } else {
              reject(new Error(`exit code ${code}`));
            }
          });
          testProcess.on('error', reject);
        });
        
        console.log(`✅ Found working yt-dlp: ${cmd}`);
        break;
      } catch (testError) {
        console.log(`❌ ${cmd} failed: ${testError.message}`);
        continue;
      }
    }
    
    if (!ytdlpCmd) {
      throw new Error('yt-dlp not found. Install with: pip install yt-dlp');
    }
    
    console.log(`Using yt-dlp command: ${ytdlpCmd}`);
    
    // Use the working yt-dlp command with correct flags
    const cmdParts = ytdlpCmd.split(' ');
    const ytdlp = spawn(cmdParts[0], [
      ...cmdParts.slice(1),
      '--format', 'bestaudio[ext=webm]/bestaudio/best',
      '--output', '-',
      '--quiet',
      '--no-warnings',
      '--no-check-certificates',
      url
    ], { shell: true });

    const ffmpeg = spawn('ffmpeg', [
      '-i', 'pipe:0',
      '-ac', '2',
      '-ar', '48000',
      '-f', 's16le',
      '-loglevel', 'error',
      '-'
    ]);

    let outputStarted = false;
    let outputBytes = 0;

    ytdlp.stdout.pipe(ffmpeg.stdin);

    ytdlp.stderr.on('data', (data) => {
      const message = data.toString();
      if (message.includes('ERROR') || message.includes('error')) {
        console.error('yt-dlp error:', message.trim());
      }
    });

    ffmpeg.stdout.on('data', (chunk) => {
      if (!outputStarted) {
        outputStarted = true;
        console.log('FFmpeg output started, chunk size:', chunk.length);
      }
      outputBytes += chunk.length;
    });

    ffmpeg.stderr.on('data', (data) => {
      const message = data.toString();
      if (message.includes('error') || message.includes('Error')) {
        console.error('FFmpeg error:', message.trim());
      }
    });

    const resource = createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.Raw,
      inlineVolume: true,
      metadata: {
        title: 'YouTube Audio (yt-dlp)',
        url: url
      }
    });

    if (resource.volume) {
      resource.volume.setVolume(1.0);
      console.log('yt-dlp processed audio volume set to 100%');
    }

    // Wait for processing to start
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('yt-dlp + FFmpeg failed to start processing'));
      }, 25000); // Increased timeout

      ffmpeg.stdout.once('data', () => {
        clearTimeout(timeout);
        resolve();
      });

      ytdlp.once('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`yt-dlp error: ${error.message}`));
      });

      ffmpeg.once('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`FFmpeg error: ${error.message}`));
      });
    });

    console.log('✅ yt-dlp + FFmpeg processing started');
    return { player, resource };
    
  } catch (error) {
    console.error('❌ Error creating yt-dlp player:', error);
    throw error;
  }
}

async function createDirectFFmpegPlayer(url) {
  console.log('Creating YouTube player with FFmpeg + yt-dlp URL extraction...');
  
  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: 'play',
      maxMissedFrames: Math.round(5000 / 20),
    }
  });

  try {
    const { spawn } = require('child_process');
    
    console.log('Getting direct stream URL with yt-dlp...');
    
    // First, get the direct stream URL using yt-dlp
    const ytdlpCommands = ['yt-dlp', 'python -m yt_dlp', 'python3 -m yt_dlp'];
    let streamUrl = null;
    
    for (const cmd of ytdlpCommands) {
      try {
        const cmdParts = cmd.split(' ');
        const getUrl = spawn(cmdParts[0], [
          ...cmdParts.slice(1),
          '--format', 'bestaudio[ext=webm]/bestaudio/best',
          '--get-url',
          '--quiet',
          url
        ], { shell: true });
        
        let urlOutput = '';
        getUrl.stdout.on('data', (data) => {
          urlOutput += data.toString();
        });
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('timeout')), 10000);
          getUrl.on('close', (code) => {
            clearTimeout(timeout);
            if (code === 0 && urlOutput.trim()) {
              streamUrl = urlOutput.trim();
              resolve();
            } else {
              reject(new Error(`exit code ${code}`));
            }
          });
          getUrl.on('error', reject);
        });
        
        if (streamUrl) {
          console.log(`Got stream URL: ${streamUrl.substring(0, 100)}...`);
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    if (!streamUrl) {
      throw new Error('Could not extract stream URL');
    }
    
    console.log('Starting FFmpeg with extracted URL...');
    
    // Use FFmpeg with the extracted direct URL
    const ffmpeg = spawn('ffmpeg', [
      '-i', streamUrl,
      '-ac', '2',
      '-ar', '48000',
      '-f', 's16le',
      '-loglevel', 'error',
      '-'
    ]);

    let outputStarted = false;
    let outputBytes = 0;

    ffmpeg.stdout.on('data', (chunk) => {
      if (!outputStarted) {
        outputStarted = true;
        console.log('Direct FFmpeg output started, chunk size:', chunk.length);
      }
      outputBytes += chunk.length;
    });

    ffmpeg.stderr.on('data', (data) => {
      const message = data.toString();
      if (message.includes('error') || message.includes('Error')) {
        console.error('Direct FFmpeg error:', message.trim());
      }
    });

    ffmpeg.on('close', (code) => {
      console.log(`Direct FFmpeg exited with code ${code}. Total output: ${outputBytes} bytes`);
    });

    const resource = createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.Raw,
      inlineVolume: true,
      metadata: {
        title: 'YouTube Audio (FFmpeg + yt-dlp URL)',
        url: url
      }
    });

    if (resource.volume) {
      resource.volume.setVolume(1.0);
      console.log('Direct FFmpeg volume set to 100%');
    }

    // Wait for processing to start
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Direct FFmpeg failed to start processing'));
      }, 15000);

      ffmpeg.stdout.once('data', () => {
        clearTimeout(timeout);
        resolve();
      });

      ffmpeg.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    console.log('✅ Direct FFmpeg processing started');
    return { player, resource };
    
  } catch (error) {
    console.error('❌ Error creating direct FFmpeg player:', error);
    throw error;
  }
}

async function createFallbackPlayer() {
  console.log('Creating fallback audio player...');
  
  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: 'play',
      maxMissedFrames: Math.round(5000 / 20),
    }
  });

  // Generate a test tone instead of relying on external URLs
  const { spawn } = require('child_process');
  
  const ffmpeg = spawn('ffmpeg', [
    '-f', 'lavfi',
    '-i', 'sine=frequency=440:duration=10',  // 10 second 440Hz tone
    '-ac', '2',
    '-ar', '48000',
    '-f', 's16le',
    '-'
  ]);

  const resource = createAudioResource(ffmpeg.stdout, {
    inputType: StreamType.Raw,
    inlineVolume: true,
    metadata: {
      title: 'Test Tone - 440Hz',
      url: 'fallback'
    }
  });

  if (resource.volume) {
    resource.volume.setVolume(0.8);
  }

  return { player, resource };
}

async function createSimplePlayer(audioUrl) {
  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: 'play',
      maxMissedFrames: Math.round(5000 / 20),
    }
  });

  const resource = createAudioResource(audioUrl, {
    inlineVolume: true
  });

  if (resource.volume) {
    resource.volume.setVolume(1.0);
    console.log('Simple player volume set to 100%');
  }

  return { player, resource };
}

async function getSongInfo(url) {
  try {
    // Try play-dl first
    const playdl = require('play-dl');
    if (playdl.yt_validate(url)) {
      const info = await playdl.video_info(url);
      return {
        title: info.video_details.title || 'Unknown Title',
        duration: parseInt(info.video_details.durationInSec) || 0,
        uploader: info.video_details.channel?.name || 'Unknown',
        thumbnail: info.video_details.thumbnails?.[0]?.url || null
      };
    }
  } catch (error) {
    console.log('play-dl info failed, trying ytdl-core...');
    
    try {
      const ytdl = require('ytdl-core');
      const info = await ytdl.getInfo(url);
      return {
        title: info.videoDetails.title || 'Unknown Title',
        duration: parseInt(info.videoDetails.lengthSeconds) || 0,
        uploader: info.videoDetails.author.name || 'Unknown',
        thumbnail: info.videoDetails.thumbnails[0]?.url || null
      };
    } catch (ytdlError) {
      console.error('Both info methods failed:', error, ytdlError);
    }
  }
  
  return {
    title: 'YouTube Audio',
    duration: 0,
    uploader: 'Unknown',
    thumbnail: null
  };
}

function isPlaylist(url) {
  return url.includes('playlist?list=') || url.includes('&list=');
}

async function createYtdlCorePlayer(url) {
  console.log('Creating YouTube player with ytdl-core...');
  
  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: 'play',
      maxMissedFrames: Math.round(5000 / 20),
    }
  });

  try {
    const ytdl = require('ytdl-core');
    
    console.log('Getting video info with ytdl-core...');
    const info = await ytdl.getInfo(url);
    console.log(`Video found: ${info.videoDetails.title}`);
    
    const stream = ytdl(url, {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25
    });

    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
      inlineVolume: true,
      metadata: {
        title: info.videoDetails.title || 'YouTube Audio',
        url: url
      }
    });

    if (resource.volume) {
      resource.volume.setVolume(1.0);
      console.log('ytdl-core volume set to 100%');
    }

    console.log('✅ ytdl-core audio resource created successfully');
    return { player, resource };
    
  } catch (error) {
    console.error('❌ ytdl-core method failed:', error);
    throw new Error(`ytdl-core failed: ${error.message}`);
  }
}

module.exports = { 
  createAudioConnection, 
  createPlayer,
  createYouTubePlayerWithProcessing,
  createYtdlCorePlayer,
  createDirectFFmpegPlayer,
  createFallbackPlayer,
  createSimplePlayer,
  getSongInfo,
  isPlaylist
};