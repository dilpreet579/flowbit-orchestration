# Flowbit Orchestration

A modern web application for orchestrating and managing Langflow workflows, built with Next.js, TypeScript, and SQLite.

## Features

- 🚀 Modern UI with Tailwind CSS and Radix UI components
- 📊 Real-time workflow execution monitoring
- 🔄 Workflow orchestration and management
- 📝 Message tracking and management
- 💾 SQLite database for data persistence
- 🔌 Webhook integration support
- 🎨 Dark/Light theme support
- ⏰ Scheduled workflow execution with cron
- 📈 Execution history and analytics

## Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Docker and Docker Compose (for Langflow integration)

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, Radix UI, shadcn/ui
- **Database**: SQLite
- **State Management**: React Hooks
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with shadcn/ui components
- **Development**: TypeScript, ESLint
- **Scheduling**: node-cron
- **Workflow Engine**: Langflow

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/dilpreet579/flowbit-orchestration.git
   cd flowbit-orchestration
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   # Add your environment variables here

   # n8n Configuration
   # N8N_BASE_URL=http://localhost:5678
   # N8N_API_KEY=your_n8n_api_key_here

   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # Langflow Configuration  
   LANGFLOW_BASE_URL=http://localhost:7860
   LANGFLOW_API_KEY=your_langflow_api_key_here
   ```

4. Start the development server:
   ```bash
   pnpm dev
   ```

5. Start Langflow services:
   ```bash
   docker-compose up -d
   ```

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── trigger/      # Workflow trigger endpoints
│   │   ├── webhook/      # Webhook endpoints
│   │   └── messages/     # Message management
│   └── (routes)/         # Page routes
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── ...               # Feature-specific components
├── lib/                   # Utility functions and shared code
│   ├── db.ts             # Database operations
│   └── cron.ts           # Scheduling functionality
├── public/               # Static assets
├── styles/               # Global styles
└── flows/                # Langflow workflow definitions
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Database

The application uses SQLite for data persistence. The database file is automatically created in the `data` directory when the application starts. The database stores:

- Workflow executions
- Execution logs
- Node execution data
- Scheduled jobs

## API Endpoints

### Workflow Management
- `POST /api/trigger` - Trigger workflow execution
- `GET /api/trigger` - Get workflow status

### Webhooks
- `POST /api/webhook/langflow/{workflowId}` - Webhook endpoint for Langflow workflows
- `GET /api/webhook/langflow/{workflowId}` - Webhook documentation

### Messages
- `GET /api/messages` - Get workflow messages
- `POST /api/messages` - Create new message

## Workflow Scheduling

The application supports scheduling workflows using cron expressions. Features include:

- Cron expression validation
- Next run time calculation
- Persistent job storage
- Automatic job recovery on restart

Example cron expressions:
- `0 0 * * *` - Every day at midnight
- `0 9 * * 1-5` - Every weekday at 9:00 AM
- `*/15 * * * *` - Every 15 minutes

## Webhook Integration

Webhooks can be used to trigger workflows from external systems. Each workflow has a unique webhook URL:

```
POST https://your-domain/api/webhook/langflow/{workflowId}
Content-Type: application/json

{
  "data": {
    "input": "value"
  }
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Langflow](https://github.com/logspace-ai/langflow)
- [Langflow Docs](https://docs.langflow.org/)
- [node-cron](https://github.com/node-cron/node-cron)