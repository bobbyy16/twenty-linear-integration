# Twenty ↔️ Linear Two-Way Sync

A robust Node.js service that provides bidirectional synchronization between Twenty CRM and Linear project management.

## 🚀 Features

### Twenty → Linear

- ✨ **Auto-create Projects**: Automatically creates Linear projects when opportunities reach CLOSED_WON stage
- 👤 **Assignee Sync**: Maps Twenty point of contact to Linear project lead
- 📅 **Date Sync**: Syncs close date to Linear target date
- 💬 **Note Sync**: Creates Linear comments from Twenty notes
- 📎 **Attachment Sync**: Syncs attachments from Twenty to Linear
- 🔄 **Update Sync**: Syncs name and metadata changes to existing projects

### Linear → Twenty

- 📊 **Progress Tracking**: Syncs Linear project progress percentage to Twenty
- 🎯 **Status Updates**: Maps Linear project states to Twenty delivery statuses
- 👥 **Lead Sync**: Updates Twenty point of contact when Linear lead changes
- 📅 **Target Date Sync**: Syncs Linear target date to Twenty close date
- 💬 **Comment Sync**: Creates Twenty notes from Linear comments
- 📎 **Attachment Sync**: Syncs Linear attachments to Twenty
- 🎯 **Milestone Tracking**: Updates progress when milestones complete

## 📋 State Mapping

| Linear State | Twenty Status |
| ------------ | ------------- |
| planned      | INITIATED     |
| started      | IN_PROGRESS   |
| paused       | ON_HOLD       |
| completed    | DELIVERED     |
| canceled     | CANCELLED     |

## 🛠️ Installation

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd twenty-linear-sync
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Server
PORT=3000

# Linear
LINEAR_API_KEY=lin_api_xxxxxxxx
LINEAR_TEAM_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
LINEAR_WEBHOOK_SECRET=your_secret_here

# Twenty
TWENTY_API_KEY=your_api_key_here
TWENTY_API_URL=https://api.twenty.com
TWENTY_WEBHOOK_SECRET=your_secret_here
```

4. **Start the server**

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

## 🔧 Setup

### Getting Linear Credentials

1. **API Key**: Go to Linear Settings → API → Personal API Keys
2. **Team ID**:
   - Visit `http://localhost:3000/test-connections` after starting the server
   - Or use Linear GraphQL Explorer to query teams
3. **Webhook Secret**: Create a webhook in Linear Settings → Webhooks

### Getting Twenty Credentials

1. **API Key**: Go to Twenty Settings → API → Generate API Key
2. **API URL**: Your Twenty instance URL (e.g., `https://your-company.twenty.com`)
3. **Webhook Secret**: Create a webhook in Twenty Settings → Webhooks

### Configuring Webhooks

#### Linear Webhook Setup

1. Go to Linear Settings → Webhooks
2. Create new webhook with URL: `https://your-domain.com/webhook/linear`
3. Select events:
   - Project → Updated
   - Issue → Updated
   - Comment → Created
   - Attachment → Created
   - ProjectMilestone → Updated
4. Copy the webhook secret to `.env`

#### Twenty Webhook Setup

1. Go to Twenty Settings → Webhooks
2. Create new webhook with URL: `https://your-domain.com/webhook/twenty`
3. Select events:
   - opportunity.updated
   - note.created
   - attachment.created
4. Copy the webhook secret to `.env`

## 📁 Project Structure

```
twenty-linear-sync/
├── controllers/
│   ├── twentyController.js    # Handles Twenty webhooks
│   └── linearController.js    # Handles Linear webhooks
├── models/
│   ├── twentyModel.js         # Twenty API client
│   └── linearModel.js         # Linear API client
├── routes/
│   └── webhookRoutes.js       # Webhook route definitions
├── index.js                   # Main server file
├── .env.example               # Environment variables template
├── package.json               # Dependencies
└── README.md                  # This file
```

## 🧪 Testing

### Test API Connections

```bash
# Start the server
npm start

# Visit in browser or curl
curl http://localhost:3000/test-connections
```

This will verify:

- ✅ Linear API connection
- ✅ Linear team access
- ✅ Twenty API connection

### Health Check

```bash
curl http://localhost:3000/webhook/health
```

## 🔄 Sync Workflow

### Creating a Project (Twenty → Linear)

1. User moves opportunity to **CLOSED_WON** stage in Twenty
2. Webhook triggers to `/webhook/twenty`
3. System validates webhook signature
4. Creates Linear project with:
   - Name from opportunity name
   - Description with embedded Twenty opportunity ID
   - Lead from point of contact email
   - Target date from close date
5. Updates Twenty opportunity with:
   - Linear project ID
   - Initial progress (0%)
   - Status set to INITIATED

### Updating Progress (Linear → Twenty)

1. User completes issues/milestones in Linear
2. Webhook triggers to `/webhook/linear`
3. System validates webhook signature
4. Extracts Twenty opportunity ID from project description
5. Updates Twenty opportunity with:
   - Current progress percentage
   - Mapped delivery status

### Syncing Comments

**Twenty → Linear:**

1. User creates note on opportunity
2. System finds linked Linear project
3. Creates comment on Linear project

**Linear → Twenty:**

1. User creates comment on project
2. System finds linked Twenty opportunity
3. Creates note on Twenty opportunity

## 🔒 Security

- ✅ **Webhook signature validation** for both Twenty and Linear
- ✅ **Environment variable protection** for sensitive credentials
- ✅ **HTTPS required** for production deployments
- ✅ **Rate limiting ready** (implement as needed)

## 🐛 Debugging

### Enable Verbose Logging

The application uses emoji-prefixed console logs:

- 📥 Incoming webhooks
- ✅ Successful operations
- ❌ Errors
- ⚠️ Warnings
- 🔄 Sync operations
- 💬 Comments
- 📎 Attachments

### Common Issues

**Issue: "Invalid signature"**

- Verify webhook secrets match in both platforms
- Check that webhook payload isn't being modified in transit

**Issue: "No linked project/opportunity"**

- Ensure opportunities reach CLOSED_WON before Linear project creation
- Check that project descriptions contain `[TwentyOpportunityId: ...]` tag

**Issue: "User not found by email"**

- Verify email addresses match exactly between platforms
- Check that users exist in both systems

## 🚀 Deployment

### Using Node.js

```bash
# Production mode with PM2
npm install -g pm2
pm2 start index.js --name twenty-linear-sync
pm2 save
pm2 startup
```

### Using Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

```bash
docker build -t twenty-linear-sync .
docker run -p 3000:3000 --env-file .env twenty-linear-sync
```

### Environment Requirements

- Node.js 16+ required
- Stable internet connection for webhook delivery
- HTTPS endpoint for production webhooks

## 📊 Monitoring

Monitor these metrics:

- Webhook delivery success rate
- Sync operation completion time
- API error rates
- Webhook signature validation failures

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - feel free to use this in your own projects!

## 🆘 Support

For issues and questions:

1. Check the debugging section above
2. Review webhook logs in both platforms
3. Test API connections using `/test-connections`
4. Check that all environment variables are set correctly

## 🎯 Roadmap

- [ ] Add retry logic for failed syncs
- [ ] Implement sync queue for high-volume scenarios
- [ ] Add dashboard for monitoring sync status
- [ ] Support for custom field mapping
- [ ] Bulk sync for existing opportunities
- [ ] Conflict resolution strategies
