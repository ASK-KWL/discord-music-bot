module.exports = {
  name: 'permissions',
  execute(message) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.channel.send('❌ Join a voice channel first!');
    }

    const permissions = voiceChannel.permissionsFor(message.guild.members.me);
    
    let permissionsList = '🔑 **Bot Permissions in Voice Channel:**\n';
    permissionsList += `Connect: ${permissions.has('Connect') ? '✅' : '❌'}\n`;
    permissionsList += `Speak: ${permissions.has('Speak') ? '✅' : '❌'}\n`;
    permissionsList += `Use Voice Activity: ${permissions.has('UseVAD') ? '✅' : '❌'}\n`;
    permissionsList += `View Channel: ${permissions.has('ViewChannel') ? '✅' : '❌'}\n`;
    
    message.channel.send(permissionsList);
  },
};