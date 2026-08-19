const { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCase, updateCaseStatus, addCaseAction } = require('../database');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // Handle button interactions
    if (interaction.isButton()) {
      if (interaction.customId === 'appeal_button') {
        const modal = new ModalBuilder()
          .setCustomId('appeal_modal')
          .setTitle('Appeal Form');

        const punishmentInput = new TextInputBuilder()
          .setCustomId('punishment_type')
          .setLabel('Type of Punishment')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const reasonInput = new TextInputBuilder()
          .setCustomId('punishment_reason')
          .setLabel('Reason for Punishment')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const appealInput = new TextInputBuilder()
          .setCustomId('appeal_text')
          .setLabel('Your Appeal')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(punishmentInput);
        const row2 = new ActionRowBuilder().addComponents(reasonInput);
        const row3 = new ActionRowBuilder().addComponents(appealInput);

        modal.addComponents(row1, row2, row3);
        await interaction.showModal(modal);
        return;
      }

      // Case action buttons
      if (interaction.customId.startsWith('case_')) {
        const [_, action, caseId] = interaction.customId.split('_');

        if (action === 'accept' || action === 'deny') {
          const reasonModal = new ModalBuilder()
            .setCustomId(`case_reason_${action}_${caseId}`)
            .setTitle(`${action.charAt(0).toUpperCase() + action.slice(1)} Case`);

          const reasonInput = new TextInputBuilder()
            .setCustomId('case_action_reason')
            .setLabel(`Reason for ${action.charAt(0).toUpperCase() + action.slice(1)}`)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

          const row = new ActionRowBuilder().addComponents(reasonInput);
          reasonModal.addComponents(row);
          await interaction.showModal(reasonModal);
          return;
        } else if (action === 'claim') {
          await interaction.deferReply({ ephemeral: true });

          try {
            const db = require('../database');
            
            console.log(`[CLAIM] Processing claim for case ${caseId}`);
            db.addCaseAction(caseId, 'claim', interaction.user.id, null);
            db.db.prepare('UPDATE cases SET status = ? WHERE id = ?').run('claimed', caseId);

            // Get case data
            const caseData = db.getCase(caseId);
            console.log(`[CLAIM] Case data retrieved:`, JSON.stringify(caseData, null, 2));
            console.log(`[CLAIM] User ID to DM: ${caseData.user_id}`);

            // Notify user via DM
            if (!caseData.user_id) {
              console.error('[CLAIM] No user_id found in case data!');
            } else {
              try {
                console.log(`[CLAIM] Attempting to fetch user ${caseData.user_id}...`);
                const user = await interaction.client.users.fetch(caseData.user_id).catch(err => {
                  console.error(`[CLAIM] Failed to fetch user:`, err.message);
                  throw err;
                });
                console.log(`[CLAIM] User fetched successfully: ${user.tag} (${user.id})`);

                const botAvatar = interaction.client.user.avatarURL({ size: 4096 }) || interaction.client.user.defaultAvatarURL;
                console.log(`[CLAIM] Bot avatar URL: ${botAvatar}`);

                const notificationEmbed = new EmbedBuilder()
                  .setColor(0x0099FF)
                  .setTitle(`Case ${caseId} - Claimed`)
                  .setDescription(`Your case has been claimed by **${interaction.user.username}** and is being reviewed.`)
                  .setFooter({ text: 'FSGPD Appeals Bot', iconURL: botAvatar });

                console.log(`[CLAIM] Sending DM to ${user.id}...`);
                await user.send({ embeds: [notificationEmbed] }).catch(err => {
                  console.error(`[CLAIM] Failed to send DM:`, err.message);
                  throw err;
                });
                console.log(`[CLAIM] ✅ DM sent successfully to user ${user.id}`);
              } catch (err) {
                console.error(`[CLAIM] ❌ Error in DM process for user ${caseData.user_id}:`, err.message);
                console.error(`[CLAIM] Full error:`, err);
              }
            }

            // Update the case embed in the log channel
            if (caseData.message_id && caseData.channel_id) {
              try {
                console.log(`[CLAIM] Fetching channel ${caseData.channel_id}`);
                const caseLogChannel = await interaction.client.channels.fetch(caseData.channel_id);
                console.log(`[CLAIM] Fetching message ${caseData.message_id}`);
                const caseMessage = await caseLogChannel.messages.fetch(caseData.message_id);
                
                const updatedEmbed = new EmbedBuilder()
                  .setColor(0x0099FF)
                  .setTitle(`${caseId} - Claimed`)
                  .setDescription(`**User:** <@${caseData.user_id}>\n**Type of Punishment:** ${caseData.type_of_punishment}\n**Reason:** ${caseData.reason_for_punishment}\n**Appeal Text:** ${caseData.appeal_text}\n\n**Status:** Claimed by ${interaction.user.username}`)
                  .setFooter({ text: 'FSGPD Appeals Bot', iconURL: interaction.client.user.avatarURL() })
                  .setTimestamp();

                // Create Accept and Deny buttons for the claimed case
                const acceptBtn = new ButtonBuilder()
                  .setCustomId(`case_accept_${caseId}`)
                  .setLabel('Accept')
                  .setStyle(ButtonStyle.Success);

                const denyBtn = new ButtonBuilder()
                  .setCustomId(`case_deny_${caseId}`)
                  .setLabel('Deny')
                  .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder().addComponents(acceptBtn, denyBtn);

                await caseMessage.edit({ embeds: [updatedEmbed], components: [row] });
                console.log(`[CLAIM] Case message updated successfully with Accept/Deny buttons`);
              } catch (err) {
                console.error(`[CLAIM] Could not update case message for ${caseId}:`, err.message);
              }
            }

            await interaction.editReply({ content: `Case ${caseId} claimed by <@${interaction.user.id}>` });
          } catch (error) {
            console.error('[CLAIM] Error claiming case:', error);
            await interaction.editReply({ content: 'An error occurred while claiming the case.' });
          }
        }
      }
      return;
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'appeal_modal') {
        try {
          await interaction.deferReply({ ephemeral: true });

          const punishmentType = interaction.fields.getTextInputValue('punishment_type');
          const punishmentReason = interaction.fields.getTextInputValue('punishment_reason');
          const appealText = interaction.fields.getTextInputValue('appeal_text');

          // Create case in database
          const caseId = createCase(interaction.user.id, punishmentType, punishmentReason, appealText);

          const caseLogChannelId = process.env.CASE_LOG_CHANNEL_ID;
          const caseLogChannel = await interaction.client.channels.fetch(caseLogChannelId);

          if (!caseLogChannel) {
            await interaction.editReply({ content: 'Error: Case log channel not found.' });
            return;
          }

          // Create case log embed
          const caseEmbed = new EmbedBuilder()
            .setColor(0xFFAA00)
            .setTitle(`${caseId} - New Appeal`)
            .setDescription(`**User:** <@${interaction.user.id}>\n**Type of Punishment:** ${punishmentType}\n**Reason:** ${punishmentReason}\n**Appeal Text:** ${appealText}`)
            .setFooter({ text: 'FSGPD Appeals Bot', iconURL: interaction.client.user.avatarURL() })
            .setTimestamp();

          // Create case action buttons
          const acceptBtn = new ButtonBuilder()
            .setCustomId(`case_accept_${caseId}`)
            .setLabel('Accept')
            .setStyle(ButtonStyle.Success);

          const denyBtn = new ButtonBuilder()
            .setCustomId(`case_deny_${caseId}`)
            .setLabel('Deny')
            .setStyle(ButtonStyle.Danger);

          const claimBtn = new ButtonBuilder()
            .setCustomId(`case_claim_${caseId}`)
            .setLabel('Claim')
            .setStyle(ButtonStyle.Primary);

          const row = new ActionRowBuilder().addComponents(acceptBtn, denyBtn, claimBtn);

          const caseLogMessage = await caseLogChannel.send({ embeds: [caseEmbed], components: [row] });

          // Update case with message info
          updateCaseStatus(caseId, 'logged', caseLogMessage.id, caseLogChannelId);

          // Confirm to user
          const confirmEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Appeal Submitted')
            .setDescription(`Your appeal has been submitted successfully!\n\n**Case ID:** ${caseId}\n\nYou will be notified when your case is reviewed.`)
            .setFooter({ text: 'FSGPD Appeals Bot', iconURL: interaction.client.user.avatarURL() });

          await interaction.editReply({ embeds: [confirmEmbed] });
        } catch (error) {
          console.error('Error processing appeal:', error);
          await interaction.editReply({ content: 'An error occurred while processing your appeal.' });
        }
        return;
      }

      // Handle case action reasons
      if (interaction.customId.startsWith('case_reason_')) {
        try {
          await interaction.deferReply({ ephemeral: true });

          const parts = interaction.customId.split('_');
          const action = parts[2]; // accept or deny
          const caseId = parts.slice(3).join('_');
          const reason = interaction.fields.getTextInputValue('case_action_reason');

          console.log(`[ACTION] Processing ${action} for case ${caseId}`);

          const db = require('../database');
          db.addCaseAction(caseId, action, interaction.user.id, reason);
          db.db.prepare('UPDATE cases SET status = ? WHERE id = ?').run(action, caseId);

          // Get the case details
          const caseData = db.getCase(caseId);
          console.log(`[ACTION] Case data retrieved:`, JSON.stringify(caseData, null, 2));

          if (!caseData.user_id) {
            console.error(`[ACTION] No user_id found in case data!`);
            await interaction.editReply({ content: 'Error: Could not find user in case data.' });
            return;
          }

          console.log(`[ACTION] Attempting to fetch user ${caseData.user_id}...`);
          let user;
          try {
            user = await interaction.client.users.fetch(caseData.user_id);
            console.log(`[ACTION] User fetched: ${user.tag}`);
          } catch (err) {
            console.error(`[ACTION] Failed to fetch user:`, err.message);
            await interaction.editReply({ content: `Error: Could not fetch user ${caseData.user_id}` });
            return;
          }

          // Notify user of case action
          const botAvatar = interaction.client.user.avatarURL({ size: 4096 }) || interaction.client.user.defaultAvatarURL;
          const notificationEmbed = new EmbedBuilder()
            .setColor(action === 'accept' ? 0x00FF00 : 0xFF0000)
            .setTitle(`Case ${caseId} - ${action.charAt(0).toUpperCase() + action.slice(1)}ed`)
            .setDescription(`**Handled by:** ${interaction.user.username}\n\n**Staff Comments:**\n\`\`\`\n${reason}\n\`\`\``)
            .setFooter({ text: 'FSGPD Appeals Bot', iconURL: botAvatar });

          try {
            console.log(`[ACTION] Sending DM to user ${user.id}...`);
            await user.send({ embeds: [notificationEmbed] });
            console.log(`[ACTION] ✅ DM sent successfully to ${user.id}`);
          } catch (err) {
            console.error(`[ACTION] ❌ Could not send DM to user ${caseData.user_id}:`, err.message);
          }

          // Update the case embed in the log channel
          if (caseData.message_id && caseData.channel_id) {
            try {
              const caseLogChannel = await interaction.client.channels.fetch(caseData.channel_id);
              const caseMessage = await caseLogChannel.messages.fetch(caseData.message_id);
              
              const statusColor = action === 'accept' ? 0x00FF00 : 0xFF0000;
              const statusText = action === 'accept' ? 'Accepted' : 'Denied';
              
              const updatedEmbed = new EmbedBuilder()
                .setColor(statusColor)
                .setTitle(`${caseId} - ${statusText}`)
                .setDescription(`**User:** <@${caseData.user_id}>\n**Type of Punishment:** ${caseData.type_of_punishment}\n**Reason:** ${caseData.reason_for_punishment}\n**Appeal Text:** ${caseData.appeal_text}\n\n**Status:** ${statusText}\n**Handled by:** ${interaction.user.username}\n**Staff Comments:**\n\`\`\`\n${reason}\n\`\`\``)
                .setFooter({ text: 'FSGPD Appeals Bot', iconURL: interaction.client.user.avatarURL() })
                .setTimestamp();

              await caseMessage.edit({ embeds: [updatedEmbed], components: [] });
              console.log(`[ACTION] Case ${caseId} message updated with ${action} status`);
            } catch (err) {
              console.error(`[ACTION] Could not update case message for ${caseId}:`, err.message);
            }
          }

          await interaction.editReply({ content: `Case ${caseId} has been ${action}ed.` });
        } catch (error) {
          console.error('Error handling case action:', error);
          await interaction.editReply({ content: 'An error occurred while processing the case action.' });
        }
        return;
      }
    }
  }
};
