const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const FSGPD_APPEALS_CHANNEL_ID = process.env.FSGPD_APPEALS_CHANNEL_ID;
const ASD_APPEALS_CHANNEL_ID = process.env.ASD_APPEALS_CHANNEL_ID;
const DISCORD_APPEALS_CHANNEL_ID = process.env.DISCORD_APPEALS_CHANNEL_ID;
const GAME_APPEALS_CHANNEL_ID = process.env.GAME_APPEALS_CHANNEL_ID;
const DEV_USER_ID = process.env.DEV_USER_ID;
const CASE_LOG_CHANNEL_ID = process.env.CASE_LOG_CHANNEL_ID;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deploy')
    .setDescription('[DEV] Deploys the Appeal embeds'),

  async execute(interaction) {
    if (interaction.user.id !== DEV_USER_ID) {
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('<:alert:1532348028785004744>ERROR<:alert:1532348028785004744>')
        .setDescription('```\nYou dont have permission to Deploy the appeal embeds\n```')
        .setFooter({ text: 'FSGPD Appeals Bot', iconURL: interaction.client.user.avatarURL() });
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      const channels = [
        { id: FSGPD_APPEALS_CHANNEL_ID, name: 'FSGPD Appeals' },
        { id: ASD_APPEALS_CHANNEL_ID, name: 'ASD Appeals' },
        { id: DISCORD_APPEALS_CHANNEL_ID, name: 'Discord Appeals' },
        { id: GAME_APPEALS_CHANNEL_ID, name: 'Game Appeals' }
      ];

      const button = new ButtonBuilder()
        .setCustomId('appeal_button')
        .setLabel('Submit Appeal')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(button);

      for (const channel of channels) {
        if (!channel.id) continue;

        const targetChannel = await interaction.client.channels.fetch(channel.id);
        if (!targetChannel) continue;

        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle(`${channel.name} Appeal Form`)
          .setDescription(`Click the button below to submit an appeal for ${channel.name}.`)
          .setFooter({ text: 'FSGPD Appeals Bot', iconURL: interaction.client.user.avatarURL() });

        await targetChannel.send({ embeds: [embed], components: [row] });
      }

      const successEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Deployment Successful')
        .setDescription('Appeal embeds have been deployed to all configured channels.');

      await interaction.reply({ embeds: [successEmbed], ephemeral: true });
    } catch (error) {
      console.error('Error deploying embeds:', error);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Deployment Failed')
        .setDescription(`Error: ${error.message}`);
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};
