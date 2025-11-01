# Twenty ↔ Linear Integration

A bidirectional webhook integration that syncs opportunities from Twenty CRM with projects in Linear, keeping your sales pipeline and project management in perfect harmony.

## 🚀 Features

- **Automatic Project Creation**: When an opportunity reaches `CLOSED_WON` in Twenty, a corresponding project is automatically created in Linear
- **Bidirectional Sync**: Changes in Linear projects sync back to Twenty opportunities
- **Status Mapping**: Intelligent mapping between Linear project states and Twenty delivery statuses
- **Progress Tracking**: Automatic calculation of project progress based on Linear issue completion
- **Secure Webhooks**: Cryptographic signature verification for both Twenty and Linear webhooks

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A Twenty workspace with API access
- A Linear workspace with API access
- A publicly accessible server (or tunneling solution for development)

## 🔧 Installation

### 1. Clone the repository

```bash
git clone https://github.com/bobbyy16/twenty-linear-integration.git
cd twenty-linear-integration
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Create a `.env` file in the root directory with the following variables:

```env
TWENTY_API_KEY=your_20_api_key
TWENTY_BASE_URL=https://your-workspace.twenty.com
TWENTY_WEBHOOK_SECRET=your_twenty_webhook_secret

LINEAR_API_KEY=your_linear_api_key
LINEAR_TEAM_ID=your_linear_team_id
LINEAR_WEBHOOK_SECRET=your_linear_webhook_secret

PORT=8080
```

### 4. Setup Webhook Endpoints

**In Twenty:**

- Configure your webhook URL to `https://<your-domain>/webhooks/twenty`
- Supply your `TWENTY_WEBHOOK_SECRET`

**In Linear:**

- Configure your webhook URL to `https://<your-domain>/webhooks/linear`
- Supply your `LINEAR_WEBHOOK_SECRET` (if applicable)

Ensure your server is reachable (public URL or via tunneling for dev).

### 5. Run the server

```bash
npm start
```

The server listens on the value of `PORT` (default 8080).

## 🌐 API Endpoints

- **`/health`** – Simple health check
- **`/webhooks/twenty`** – Handle Twenty webhooks
- **`/webhooks/linear`** – Handle Linear webhooks

## 🔄 Flow Overview

### Twenty → Linear

1. Opportunity in Twenty moves to stage `CLOSED_WON`
2. This triggers the webhook
3. The middleware `validateTwentyWebhook` confirms the signature
4. `twentyService.handleOpportunityUpdate()` creates a new project in Linear (via `linearApi.createProject`)
5. It then updates the Twenty opportunity with:
   - `linearprojectid`
   - `projectProgress=0`
   - `deliverystatus=INITIATED`
   - `syncstatus=SYNCED`

### Linear → Twenty

1. A project in Linear updates (e.g., status changes or issue progress)
2. The webhook on `/webhooks/linear` triggers `linearService.handleProjectUpdate()` or `handleIssueUpdate()`
3. The sync service finds the linked Twenty opportunity (`extractTwentyIdFromLinear()`, which reads the Linear project description for `[TwentyOpportunityId: …]`)
4. It builds a payload mapping Linear status → Twenty fields (`deliverystatus`, `projectprogress`, `closeDate`, etc.)
5. It calls `twentyApi.updateOpportunity()` to update the record in Twenty

## 🛠️ Configuration & Mappings

`config/fieldMappings.js` holds all field-name mappings and enums (Twenty field names, delivery status values, sync status values).

### Default Linear Status Mappings

| Linear State                    | Progress | Delivery Status |
| ------------------------------- | -------- | --------------- |
| backlog                         | 0%       | INITIATED       |
| planned                         | 10%      | INITIATED       |
| in progress / started           | 40%      | IN_PROGRESS     |
| completed / done / finished     | 100%     | DELIVERED       |
| canceled / cancelled / archived | 0%       | CANCELLED       |

### Custom Fields in Twenty

Ensure the custom fields in Twenty match the internal API names and types:

- `linearprojectid` – Text field for Linear project ID
- `projectprogress` – Number/decimal field for progress (0-1 or 0-100)
- `deliverystatus` – Select field with values: INITIATED, IN_PROGRESS, DELIVERED, CANCELLED
- `syncstatus` – Select field with values: SYNCED, PENDING, ERROR

## 🎯 Contribution

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Submit a Pull Request

Feel free to open issues for bugs or enhancements.

## 📄 License

This project is licensed under the MIT License.

## 🤝 Acknowledgements

Thanks to the teams behind the Twenty API and Linear API for enabling these integrations.

Inspired by the need to keep CRM data and project tracking in sync with minimal manual effort.
