const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowComponentBuilder,
} = require('discord.js');

const HCDF_APPEAL_CHANNEL_ID = process.env.HCDF_APPEAL_CHANNEL_ID;
const RSF_APPEAL_CHANNEL_ID = process.env.RSF_APPEAL_CHANNEL_ID;
const DISCORD_APPEALS_CHANNEL_ID = process.env.DISCORD_APPEALS_CHANNEL_ID;
const GAME_APPEALS_CHANNEL_ID = process.env.GAME_APPEALS_CHANNEL_ID;

module.exports = { 
  data: new SlashCommandBuilder()
    .setName('deploy')
    .setDescription('Deploys the bot commands to the server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const errorcontainer = new ContainerBuilder()
    .setAccentColor(16711685)
    .addTextDisplayComponents((textDisplay) => textDisplay
        .setContent("# Error")
    )
    .addSeparatorComponents((separator) => separator
        .setDivider(true)
    )
    .addTextDisplayComponents((textDisplay) => textDisplay
        .setContent(" You dont have the Required Permission to Deploy the Containers.")
    );
      return interaction.reply({
        components: [errorcontainer],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      
      });
    }
    const hcdfButton = new ButtonBuilder()
      .setCustomId('hcdf_appeal')
      .setLabel('Appeal')
      .setStyle(ButtonStyle.Secondary);

    const hcdfRow = new ActionRowBuilder().addComponents(hcdfButton);

    const hcdfContainer = new ContainerBuilder()
      .setAccentColor(1791)
      .addSectionComponents((section) => section
        .addTextDisplayComponents((textDisplay) => textDisplay
          .setContent('# HCDF Appeals'))
        .setThumbnailAccessory((thumbnail) => thumbnail
          .setURL('https://cdn.discordapp.com/attachments/1545091657480011872/1565784856405741608/Security_avatar1.png?ex=6af2b088&is=6af15f08&hm=6e3f33959f37a4256357da6d4163fd60c728ed78b1e421e52f0b5e40de26a08c'))
      )
      .addSeparatorComponents((separator) => separator
        .setDivider(true))
      .addTextDisplayComponents((textDisplay) => textDisplay
        .setContent(' ### HCDF Appeals\nIn this Channel you can Appeal your Punishments from the Helios Energy Corp Defence Firm '))
      .addSeparatorComponents((separator) => separator
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Large))
      .addTextDisplayComponents((textDisplay) => textDisplay
        .setContent(`-# ${interaction.client.user.username} · ${new Date().toLocaleString()}`));

    const hcdfChannel = await interaction.client.channels.fetch(HCDF_APPEAL_CHANNEL_ID);

    await hcdfChannel.send({
      components: [hcdfContainer, hcdfRow],
      flags: MessageFlags.IsComponentsV2,
    });

    const rsfButton = new ButtonBuilder()
      .setCustomId('rsf_appeal')
      .setLabel('Appeal')
      .setStyle(ButtonStyle.Secondary);

    const rsfRow = new ActionRowBuilder().addComponents(rsfButton);

    const rsfContainer = new ContainerBuilder()
      .setAccentColor(16711684)
      .addSectionComponents((section) => section
        .addTextDisplayComponents((textDisplay) => textDisplay
          .setContent('# RSF Appeals'))
        .setThumbnailAccessory((thumbnail) => thumbnail
          .setURL('https://cdn.discordapp.com/attachments/1545091657480011872/1565790984774885488/image.png?ex=6af2b63d&is=6af164bd&hm=c29e1c326a65763c0f4344e17e5f2296817969013f357d5a2073f4ef2c6a4ab9'))
      )
      .addSeparatorComponents((separator) => separator
        .setDivider(true))
      .addTextDisplayComponents((textDisplay) => textDisplay
        .setContent('### RSF Appeals\nIn this Channel you can Appeal your Punishments issued in Rebellion Syndicate Forces'))
      .addSeparatorComponents((separator) => separator
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Large))
      .addTextDisplayComponents((textDisplay) => textDisplay
        .setContent(`-# ${interaction.client.user.username} · ${new Date().toLocaleString()}`));

    const rsfChannel = await interaction.client.channels.fetch(RSF_APPEAL_CHANNEL_ID);

    await rsfChannel.send({
      components: [rsfContainer, rsfRow],
      flags: MessageFlags.IsComponentsV2,
    });

    const discordButton = new ButtonBuilder()
      .setCustomId('discord_appeal')
      .setLabel('Appeal')
      .setStyle(ButtonStyle.Secondary);

    const discordRow = new ActionRowBuilder().addComponents(discordButton);

    const discordContainer = new ContainerBuilder()
      .setAccentColor(26879)
      .addSectionComponents((section) => section
        .addTextDisplayComponents((textDisplay) => textDisplay
          .setContent('# Discord Appeals'))
        .setThumbnailAccessory((thumbnail) => thumbnail
          .setURL('https://cdn.discordapp.com/attachments/1545091657480011872/1565785532921937960/Mod_dept_Avatar_NEw.png?ex=6af2b129&is=6af15fa9&hm=f26ce5201fa1cd3c7cc74444b3550338a3cd7da45419f53af73a7d92d81839e1'))
      )
      .addSeparatorComponents((separator) => separator
        .setDivider(true))
      .addTextDisplayComponents((textDisplay) => textDisplay
        .setContent('### Discord Appeals\nIn this Channel you can Appeal your Punishments issued in The Main Server Such as Bans, Mutes, Strikes, Warns.'))
      .addSeparatorComponents((separator) => separator
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Large))
      .addTextDisplayComponents((textDisplay) => textDisplay
        .setContent(`-# ${interaction.client.user.username} · ${new Date().toLocaleString()}`));

    const discordChannel = await interaction.client.channels.fetch(DISCORD_APPEALS_CHANNEL_ID);

    await discordChannel.send({
      components: [discordContainer, discordRow],
      flags: MessageFlags.IsComponentsV2,
    });

    const gameButton = new ButtonBuilder()
      .setCustomId('game_appeal')
      .setLabel('Appeal')
      .setStyle(ButtonStyle.Secondary);

    const gameRow = new ActionRowBuilder().addComponents(gameButton);

    const gameContainer = new ContainerBuilder()
      .setAccentColor(16711684)
      .addSectionComponents((section) => section
        .addTextDisplayComponents((textDisplay) => textDisplay
          .setContent('# Game Appeals'))
        .setThumbnailAccessory((thumbnail) => thumbnail
          .setURL('https://cdn.discordapp.com/attachments/1545091657480011872/1565785532921937960/Mod_dept_Avatar_NEw.png?ex=6af2b129&is=6af15fa9&hm=f26ce5201fa1cd3c7cc74444b3550338a3cd7da45419f53af73a7d92d81839e1'))
      )
      .addSeparatorComponents((separator) => separator
        .setDivider(true))
      .addTextDisplayComponents((textDisplay) => textDisplay
        .setContent('### Game Appeals\nIn this Channel you can Appeal your Punishments issued in the Game such as Bans, Warns, Combat Restrictions.'))
      .addSeparatorComponents((separator) => separator
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Large))
      .addTextDisplayComponents((textDisplay) => textDisplay
        .setContent(`-# ${interaction.client.user.username} · ${new Date().toLocaleString()}`));

    const gameChannel = await interaction.client.channels.fetch(GAME_APPEALS_CHANNEL_ID);

    await gameChannel.send({
      components: [gameContainer, gameRow],
      flags: MessageFlags.IsComponentsV2,
    });
    const container = new ContainerBuilder()
    .setAccentColor(26879)
    .addTextDisplayComponents((textDisplay) => textDisplay
        .setContent("### Succesfully Deployed appeal Containers")
    );

    await interaction.reply({components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral});
     
  }
}