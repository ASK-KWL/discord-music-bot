const { createAudioPlayer, createAudioResource, joinVoiceChannel, StreamType } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');
const os = require('os');

function createAudioConnection(message) {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) throw new Error('Join a voice channel first.');

  console.log(`Creating voice connection to channel: ${voiceChannel.id}`);
  return joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: message.guild.id,
    adapterCreator: message.guild.voiceAdapterCreator,
  });
}

async function createPlayer(url) {
  console.log('Creating audio player with @distube/ytdl-core');
  
  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: 'play', // Keep playing even if no subscribers
      maxMissedFrames: Math.round(5000 / 20),
    }
  });

  try {
    console.log(`Creating stream for: ${url}`);
    
    // Use the more stable ytdl-core fork
    const stream = ytdl(url, {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25,
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'cross-site'
        }
      }
    });

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

    // Handle stream errors
    stream.on('error', (error) => {
      console.error('❌ Stream error:', error);
    });

    console.log('✅ YouTube audio resource created successfully');
    return { player, resource };
    
  } catch (error) {
    console.error('❌ Error creating YouTube player:', error);
    throw new Error(`Failed to create YouTube player: ${error.message}`);
  }
}

async function createPlayerWithFallback(url) {
  console.log('Creating player with fallback system');
  
  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: 'pause',
      maxMissedFrames: Math.round(5000 / 20),
    }
  });

  // Try multiple approaches
  const attempts = [
    // Attempt 1: Basic ytdl
    async () => {
      console.log('Attempt 1: Basic ytdl stream');
      const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });
      return createAudioResource(stream, { inputType: StreamType.Arbitrary, inlineVolume: true });
    },
    
    // Attempt 2: Lower quality
    async () => {
      console.log('Attempt 2: Lower quality stream');
      const stream = ytdl(url, { filter: 'audioonly', quality: 'lowestaudio' });
      return createAudioResource(stream, { inputType: StreamType.Arbitrary, inlineVolume: true });
    },
    
    // Attempt 3: Different format
    async () => {
      console.log('Attempt 3: Different format');
      const stream = ytdl(url, { filter: 'audio', format: 'mp4' });
      return createAudioResource(stream, { inputType: StreamType.Arbitrary, inlineVolume: true });
    }
  ];

  for (let i = 0; i < attempts.length; i++) {
    try {
      const resource = await attempts[i]();
      if (resource.volume) {
        resource.volume.setVolume(0.8);
      }
      console.log(`✅ Attempt ${i + 1} successful`);
      return { player, resource };
    } catch (error) {
      console.error(`❌ Attempt ${i + 1} failed:`, error.message);
      if (i === attempts.length - 1) {
        throw new Error(`All ${attempts.length} attempts failed. Last error: ${error.message}`);
      }
    }
  }
}

async function getSongInfo(url) {
  try {
    console.log(`Getting info for: ${url}`);
    
    const info = await ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        }
      }
    });
    
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
  createPlayerWithFallback,
  getSongInfo,
  isPlaylist
};