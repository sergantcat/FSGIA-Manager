# FSGIA Manager - Appeal System Implementation

## What's Been Implemented

### Features:
1. **Deploy Command** - Slash command that deploys appeal embeds with buttons to configured channels
2. **Appeal Form Modal** - When users click "Submit Appeal", they get a form with:
   - Type of Punishment (text input)
   - Reason for Punishment (paragraph text)
   - Appeal Text (paragraph text)

3. **Case Logging System**:
   - Automatically creates a case when appeal is submitted (Case-1, Case-2, etc.)
   - Logs case to the case log channel with embed and action buttons
   - Each case is saved in a SQLite database (`appeals.db`)

4. **Case Management Buttons**:
   - **Accept** - Opens a modal to enter acceptance reason
   - **Deny** - Opens a modal to enter denial reason
   - **Claim** - Claims the case (no reason needed)
   - All actions are logged in the database

5. **User Notifications**:
   - User receives confirmation when appeal is submitted with their Case ID
   - User receives DM notification when case is accepted/denied with reason

## File Structure

```
FSGIA Manager/
├── index.js                 # Main bot file
├── database.js              # SQLite database setup and helpers
├── package.json
├── .env                     # Environment variables
├── commands/
│   └── deploy.js           # Deploy command implementation
├── events/
│   ├── buttonInteraction.js # Button click handler
│   └── modalSubmit.js      # Modal submission handler
└── appeals.db              # SQLite database (auto-created)
```

## Configuration Required

### 1. Add Channel IDs to `.env`

You need to add Discord channel IDs for:
- **FSGPD_APPEALS_CHANNEL_ID** - Where FSGPD appeals form will be posted
- **ASD_APPEALS_CHANNEL_ID** - Where ASD appeals form will be posted
- **DISCORD_APPEALS_CHANNEL_ID** - Where Discord appeals form will be posted
- **GAME_APPEALS_CHANNEL_ID** - Where Game appeals form will be posted
- **CASE_LOG_CHANNEL_ID** - Where cases will be logged and managed
- **DEV_USER_ID** - Your Discord user ID (only you can use /deploy)

Example:
```
DEV_USER_ID = "123456789"
FSGPD_APPEALS_CHANNEL_ID = "987654321"
CASE_LOG_CHANNEL_ID = "111222333"
```

### 2. Enable Discord Intents

If you want the bot to send DMs to users, you need to enable these intents in Discord Developer Portal:
- Go to Application > Bot
- Under "Privileged Gateway Intents", enable:
  - Message Content Intent
  - Direct Messages Intent

Currently, the bot only uses the **Guilds** intent to avoid permission issues. To add more features, enable these intents.

## How to Use

### 1. Run the bot:
```bash
node index.js
```

### 2. Use the deploy command in Discord:
```
/deploy
```
This will post appeal forms to all configured channels.

### 3. Users submit appeals:
- Click "Submit Appeal" button
- Fill out the form
- Submit and receive confirmation with Case ID

### 4. Staff manages cases:
- See new cases in the case log channel
- Click Accept/Deny to provide reasons
- Click Claim to claim the case
- User receives DM notification of case decision

## Database

The system uses **SQLite** (better-sqlite3) to store:
- **cases** - All appeal cases with their data
- **case_actions** - All actions taken on cases (accept, deny, claim)

Database file: `appeals.db`

## Commands

- `/deploy` - Deploys appeal embeds to all configured channels (dev only)

## Troubleshooting

### Bot won't start
- Check that all required .env variables are set (DISCORD_TOKEN, CLIENT_ID, GUILD_ID)
- Ensure the bot token is valid

### "Used disallowed intents" error
- Make sure the intents are enabled in Discord Developer Portal
- Currently only using Guilds intent by default

### Buttons/Modals not working
- Make sure all event files are in the `events/` folder
- Check that the bot has proper permissions in the guild
