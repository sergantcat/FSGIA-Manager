const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  ThumbnailBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const db = require('../db.js');

const COMPONENTS_V2 = MessageFlags.IsComponentsV2;
const EPHEMERAL_V2 = MessageFlags.Ephemeral | COMPONENTS_V2;
const STAFF_ROLE_ID = '1508910962130948237';

function createContainer(color, sections, actionRow) {
  const container = new ContainerBuilder().setAccentColor(color);

  for (const section of sections) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(section),
    );
  }

  if (actionRow) {
    container.addActionRowComponents(actionRow);
  }

  return container;
}

async function getCaseNumber(caseData) {
  const result = await db.knex('cases')
    .where(function whereEarlierCases() {
      this.where('created_at', '<', caseData.created_at)
        .orWhere(function whereEarlierIdsAtSameTime() {
          this.where('created_at', caseData.created_at)
            .andWhere('id', '<=', caseData.id);
        });
    })
    .count('* as case_number')
    .first();

  return Number(result.case_number);
}

function createCaseContainer(caseData, heading, color, options = {}) {
  const container = new ContainerBuilder().setAccentColor(color);
  const header = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${options.staffMention ? `<@&${STAFF_ROLE_ID}>\n` : ''}### Case #${caseData.case_number ?? caseData.id} - ${heading}\n**Opened by:** <@${caseData.user_id}>`,
      ),
    )
    .setThumbnailAccessory(
      new ThumbnailBuilder()
        .setURL(options.openerAvatarUrl)
        .setDescription(`Avatar of case opener ${caseData.user_id}`),
    );

  container
    .addSectionComponents(header)
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent([
        `**Type of Punishment:** ${caseData.type_of_punishment}`,
        `**${caseData.account_type || 'Roblox'} Username:** ${caseData.account_username || caseData.roblox_username || 'Not provided'}`,
        `**Reason:**\n${caseData.reason_for_punishment}`,
        `**Appeal Text:**\n${caseData.appeal_text}`,
        `**Status:** ${options.status || heading}`,
        options.handledBy && `**Handled by:** ${options.handledBy}`,
        options.staffReason && `**Staff Comments:**\n${options.staffReason}`,
      ].filter(Boolean).join('\n\n')),
    )
    .addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );

  if (options.actionRow) {
    container
      .addActionRowComponents(options.actionRow)
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );
  }

  return container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**${options.botUsername}** • Case ID: \`${caseData.id}\``,
    ),
  );
}

const APPEAL_BUTTON_CATEGORIES = {
  hcdf_appeal: 'hcdf',
  rsf_appeal: 'rsf',
  discord_appeal: 'discord',
  game_appeal: 'game',
};

function getPunishmentChoices(category) {
  const choicesByCategory = {
    hcdf: ['Strike', 'Blacklist', 'Warn'],
    hecdf: ['Strike', 'Blacklist', 'Warn'],
    rsf: ['Blacklist', 'Strike', 'Warn'],
    discord: ['Ban', 'Mute', 'Strike', 'Warn'],
    game: ['Ban', 'Combat Restriction', 'Warn'],
    legacy: ['Ban', 'Warn', 'Mute', 'Strike'],
  };

  return choicesByCategory[category] || [];
}

function createAppealModal(category) {
  const punishmentSelect = new StringSelectMenuBuilder()
    .setCustomId('punishment_type')
    .setPlaceholder('Choose the punishment to appeal')
    .addOptions(
      getPunishmentChoices(category).map((choice) => ({
        label: choice,
        value: choice,
      })),
    );

  return new ModalBuilder()
    .setCustomId(`appeal_modal:${category}`)
    .setTitle('Appeal Form')
    .addLabelComponents(
      new LabelBuilder()
        .setLabel('Type of Punishment')
        .setStringSelectMenuComponent(punishmentSelect),
      new LabelBuilder()
        .setLabel(getAccountUsernameLabel(category))
        .setTextInputComponent(
          createModalTextInput(
            'account_username',
            null,
            TextInputStyle.Short,
            getAccountUsernameMaxLength(category),
          ).setMinLength(getAccountUsernameMinLength(category)),
        ),
      new LabelBuilder()
        .setLabel('Reason for Punishment')
        .setTextInputComponent(
          createModalTextInput(
            'punishment_reason',
            null,
            TextInputStyle.Paragraph,
            1200,
          ),
        ),
      new LabelBuilder()
        .setLabel('Your Appeal')
        .setTextInputComponent(
          createModalTextInput(
            'appeal_text',
            null,
            TextInputStyle.Paragraph,
            1800,
          ),
        ),
    );
}

function getAccountUsernameType(category) {
  return ['hcdf', 'hecdf', 'rsf', 'discord'].includes(category)
    ? 'Discord'
    : 'Roblox';
}

function getAccountUsernameLabel(category) {
  return `${getAccountUsernameType(category)} Username`;
}

function getAccountUsernameMinLength(category) {
  return getAccountUsernameType(category) === 'Discord' ? 2 : 3;
}

function getAccountUsernameMaxLength(category) {
  return getAccountUsernameType(category) === 'Discord' ? 32 : 20;
}

function createModalTextInput(customId, label, style, maxLength) {
  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setStyle(style)
    .setMaxLength(maxLength)
    .setRequired(true);

  if (label) {
    input.setLabel(label);
  }

  return input;
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isButton()) {
      const buttonCategory = APPEAL_BUTTON_CATEGORIES[interaction.customId];
      if (
        interaction.customId === 'appeal_button' ||
        interaction.customId.startsWith('appeal_button:') ||
        buttonCategory
      ) {
        const category = buttonCategory || interaction.customId.split(':')[1] || 'legacy';
        if (!getPunishmentChoices(category).length) {
          await interaction.reply({
            components: [
              createContainer(0xFF0000, [
                '# Appeal Unavailable',
                'This appeal category is not configured.',
              ]),
            ],
            flags: EPHEMERAL_V2,
          });
          return;
        }

        await interaction.showModal(createAppealModal(category));
        return;
      }

      if (interaction.customId.startsWith('case_')) {
        const [, action, ...caseIdParts] = interaction.customId.split('_');
        const caseId = caseIdParts.join('_');

        if (action === 'accept' || action === 'deny') {
          const reasonModal = new ModalBuilder()
            .setCustomId(`case_reason_${action}_${caseId}`)
            .setTitle(`${action === 'accept' ? 'Accept' : 'Deny'} Case`)
            .addComponents(
              new ActionRowBuilder().addComponents(
                createModalTextInput(
                  'case_action_reason',
                  `Reason for ${action}`,
                  TextInputStyle.Paragraph,
                  1500,
                ),
              ),
            );

          await interaction.showModal(reasonModal);
          return;
        }

        if (action === 'claim') {
          await interaction.deferReply({ flags: EPHEMERAL_V2 });

          try {
            await db.applyCaseAction(caseId, 'claim', interaction.user.id, null);
            const caseData = await db.getCase(caseId);

            if (!caseData) {
              throw new Error(`Case ${caseId} was not found after claiming.`);
            }
            const caseNumber = await getCaseNumber(caseData);

            let caseUser;
            let openerAvatarUrl = interaction.client.user.defaultAvatarURL;
            try {
              caseUser = await interaction.client.users.fetch(caseData.user_id);
              openerAvatarUrl = caseUser.displayAvatarURL({ size: 256 });
            } catch (error) {
              console.error(`[CLAIM] Could not fetch case opener ${caseData.user_id}:`, error);
            }

            if (caseUser) {
              try {
              const notification = createContainer(0x0099FF, [
                `### Case ${caseId} - Claimed`,
                `Your case has been claimed by **${interaction.user.username}** and is being reviewed.`,
              ]);

              await caseUser.send({
                components: [notification],
                flags: COMPONENTS_V2,
              });
              } catch (error) {
                console.error(`[CLAIM] Could not notify user ${caseData.user_id}:`, error);
              }
            }

            if (caseData.message_id && caseData.channel_id) {
              try {
                const caseLogChannel = await interaction.client.channels.fetch(
                  caseData.channel_id,
                );
                const caseMessage = await caseLogChannel.messages.fetch(
                  caseData.message_id,
                );
                const acceptButton = new ButtonBuilder()
                  .setCustomId(`case_accept_${caseId}`)
                  .setLabel('Accept')
                  .setStyle(ButtonStyle.Success);
                const denyButton = new ButtonBuilder()
                  .setCustomId(`case_deny_${caseId}`)
                  .setLabel('Deny')
                  .setStyle(ButtonStyle.Danger);
                const row = new ActionRowBuilder().addComponents(
                  acceptButton,
                  denyButton,
                );
                const container = createCaseContainer(
                  { ...caseData, case_number: caseNumber },
                  'Claimed',
                  0x0099FF,
                  {
                    status: `Claimed by ${interaction.user.username}`,
                    actionRow: row,
                    openerAvatarUrl,
                    botUsername: interaction.client.user.username,
                  },
                );

                await caseMessage.edit({
                  embeds: [],
                  components: [container],
                  flags: COMPONENTS_V2,
                });
              } catch (error) {
                console.error(`[CLAIM] Could not update case message ${caseId}:`, error);
              }
            }

            await interaction.editReply({
              components: [
                createContainer(0x0099FF, [
                  `### Case ${caseId} claimed`,
                  `Claimed by <@${interaction.user.id}>.`,
                ]),
              ],
              flags: COMPONENTS_V2,
            });
          } catch (error) {
            console.error('[CLAIM] Error claiming case:', error);
            await interaction.editReply({
              components: [
                createContainer(0xFF0000, [
                  `### Claim Failed`,
                  `An error occurred while claiming the case.`,
                ]),
              ],
              flags: COMPONENTS_V2,
            });
          }
        }
      }

      return;
    }

    if (!interaction.isModalSubmit()) {
      return;
    }

    if (interaction.customId.startsWith('appeal_modal:')) {
      await interaction.deferReply({ flags: EPHEMERAL_V2 });

      try {
        const category = interaction.customId.split(':')[1];
        const punishmentType = interaction.fields.getStringSelectValues('punishment_type')[0];
        if (!getPunishmentChoices(category).includes(punishmentType)) {
          throw new Error(`Invalid punishment type "${punishmentType}" for category "${category}".`);
        }
        const accountUsername = interaction.fields.getTextInputValue('account_username').trim();
        const accountUsernameType = getAccountUsernameType(category);
        const validUsername = accountUsernameType === 'Discord'
          ? accountUsername.length >= 2 && accountUsername.length <= 32
          : /^[A-Za-z0-9_]{3,20}$/.test(accountUsername);
        if (!validUsername) {
          throw new Error(`INVALID_${accountUsernameType.toUpperCase()}_USERNAME`);
        }
        const punishmentReason = interaction.fields.getTextInputValue('punishment_reason');
        const appealText = interaction.fields.getTextInputValue('appeal_text');
        const newCase = await db.createCase(
          interaction.user.id,
          punishmentType,
          punishmentReason,
          appealText,
          accountUsername,
          accountUsernameType,
        );
        const caseId = typeof newCase === 'string' ? newCase : newCase.id;
        const caseData = await db.getCase(caseId);
        if (!caseData) {
          throw new Error(`Case ${caseId} was not found after creation.`);
        }
        const caseNumber = await getCaseNumber(caseData);

        const caseLogChannelId = process.env.CASE_LOG_CHANNEL_ID;
        if (!caseLogChannelId) {
          throw new Error('CASE_LOG_CHANNEL_ID is not configured.');
        }

        const caseLogChannel = await interaction.client.channels.fetch(caseLogChannelId);
        if (!caseLogChannel) {
          throw new Error(`Case log channel ${caseLogChannelId} was not found.`);
        }

        const acceptButton = new ButtonBuilder()
          .setCustomId(`case_accept_${caseId}`)
          .setLabel('Accept')
          .setStyle(ButtonStyle.Success);
        const denyButton = new ButtonBuilder()
          .setCustomId(`case_deny_${caseId}`)
          .setLabel('Deny')
          .setStyle(ButtonStyle.Danger);
        const claimButton = new ButtonBuilder()
          .setCustomId(`case_claim_${caseId}`)
          .setLabel('Claim')
          .setStyle(ButtonStyle.Primary);
        const row = new ActionRowBuilder().addComponents(
          acceptButton,
          denyButton,
          claimButton,
        );
        const caseLogMessage = await caseLogChannel.send({
          components: [
            createCaseContainer(
              {
                id: caseId,
                case_number: caseNumber,
                user_id: interaction.user.id,
                type_of_punishment: punishmentType,
                account_username: accountUsername,
                account_type: accountUsernameType,
                reason_for_punishment: punishmentReason,
                appeal_text: appealText,
              },
              'New Appeal',
              0xFFAA00,
              {
                status: 'Pending',
                actionRow: row,
                openerAvatarUrl: interaction.user.displayAvatarURL({ size: 256 }),
                botUsername: interaction.client.user.username,
                staffMention: true,
              },
            ),
          ],
          flags: COMPONENTS_V2,
          allowedMentions: {
            roles: [STAFF_ROLE_ID],
            users: [],
          },
        });

        await db.updateCaseStatus(
          caseId,
          'logged',
          caseLogMessage.id,
          caseLogChannelId,
        );

        await interaction.editReply({
          components: [
            createContainer(0x00FF00, [
              `### Appeal Submitted`,
              `Your appeal has been submitted successfully.\n\n**Case ID:** ${caseId}\n\nYou will be notified when your case is reviewed.`,
            ]),
          ],
          flags: COMPONENTS_V2,
        });
      } catch (error) {
        console.error('Error processing appeal:', error);
        await interaction.editReply({
          components: [
            createContainer(0xFF0000, [
              `### Appeal Submission Failed`,
              error.message === 'INVALID_DISCORD_USERNAME'
                ? 'Enter a Discord username between 2 and 32 characters.'
                : error.message === 'INVALID_ROBLOX_USERNAME'
                  ? 'Enter a valid Roblox username (3-20 letters, numbers, or underscores).'
                  : error.message.includes('DATABASE_URL')
                    ? 'Appeal submissions are temporarily unavailable because the database is not configured. Please contact staff.'
                    : 'An error occurred while processing your appeal.',
            ]),
          ],
          flags: COMPONENTS_V2,
        });
      }

      return;
    }

    if (!interaction.customId.startsWith('case_reason_')) {
      return;
    }

    await interaction.deferReply({ flags: EPHEMERAL_V2 });

    try {
      const [, , action, ...caseIdParts] = interaction.customId.split('_');
      const caseId = caseIdParts.join('_');
      const reason = interaction.fields.getTextInputValue('case_action_reason');

      if (action !== 'accept' && action !== 'deny') {
        throw new Error(`Unsupported case action: ${action}`);
      }

      await db.applyCaseAction(caseId, action, interaction.user.id, reason);
      const caseData = await db.getCase(caseId);

      if (!caseData) {
        throw new Error(`Case ${caseId} was not found after the action.`);
      }

      const statusText = action === 'accept' ? 'Accepted' : 'Denied';
      const color = action === 'accept' ? 0x00FF00 : 0xFF0000;
      let caseUser;
      let openerAvatarUrl = interaction.client.user.defaultAvatarURL;

      try {
        caseUser = await interaction.client.users.fetch(caseData.user_id);
        openerAvatarUrl = caseUser.displayAvatarURL({ size: 256 });
      } catch (error) {
        console.error(`[ACTION] Could not fetch case opener ${caseData.user_id}:`, error);
      }

      if (caseUser) {
        try {
          await caseUser.send({
          components: [
            createContainer(color, [
              `### Case ${caseId} - ${statusText}`,
              `**Handled by:** ${interaction.user.username}`,
              `**Staff Comments:**\n${reason}`,
            ]),
          ],
          flags: COMPONENTS_V2,
          });
        } catch (error) {
          console.error(`[ACTION] Could not notify user ${caseData.user_id}:`, error);
        }
      }

      if (caseData.message_id && caseData.channel_id) {
        try {
          const caseLogChannel = await interaction.client.channels.fetch(
            caseData.channel_id,
          );
          const caseMessage = await caseLogChannel.messages.fetch(caseData.message_id);
          const caseNumber = await getCaseNumber(caseData);
          const container = createCaseContainer(
            { ...caseData, case_number: caseNumber },
            statusText,
            color,
            {
              status: statusText,
              handledBy: interaction.user.username,
              staffReason: reason,
              openerAvatarUrl,
              botUsername: interaction.client.user.username,
            },
          );

          await caseMessage.edit({
            embeds: [],
            components: [container],
            flags: COMPONENTS_V2,
          });
        } catch (error) {
          console.error(`[ACTION] Could not update case message ${caseId}:`, error);
        }
      }

      await interaction.editReply({
        components: [
          createContainer(color, [
            `### Case ${caseId} ${statusText.toLowerCase()}`,
            `Handled by <@${interaction.user.id}>.`,
          ]),
        ],
        flags: COMPONENTS_V2,
      });
    } catch (error) {
      console.error('Error handling case action:', error);
      await interaction.editReply({
        components: [
          createContainer(0xFF0000, [
            `### Case Action Failed`,
            `An error occurred while processing the case action.`,
          ]),
        ],
        flags: COMPONENTS_V2,
      });
    }
  },
};
