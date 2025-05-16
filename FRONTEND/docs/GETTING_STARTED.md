# Getting Started with Frontend Development

This guide will help you set up and run the frontend application.

## Prerequisites

- Node.js 20.x or later
- Bun package manager
- Git

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd FRONTEND
```

2. Install dependencies:
```bash
bun install
```

3. Create environment file:
```bash
cp .env-example .env
```

4. Configure environment variables in `.env`:
```env
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080
```

## Development

### Running the Development Server

Start the development server:
```bash
bun run dev
```

The application will be available at `http://localhost:5173` by default.

### Building for Production

Create a production build:
```bash
bun run build
```

The build output will be in the `dist` directory.

### Preview Production Build

Preview the production build locally:
```bash
bun run preview
```

## Project Structure

```
FRONTEND/
├── src/
│   ├── components/     # React components
│   ├── services/      # API services
│   ├── store/         # State management
│   ├── types/         # TypeScript types
│   ├── utils/         # Utility functions
│   └── App.tsx        # Root component
├── public/            # Static assets
├── index.html         # Entry HTML
└── vite.config.ts     # Vite configuration
```

## Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run preview` - Preview production build
- `bun run lint` - Run ESLint
- `bun run type-check` - Run TypeScript type checking

## Development Tools

### VS Code Extensions

Recommended extensions for development:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- vscode-styled-components

### Browser Extensions

- React Developer Tools
- Redux DevTools (if using Redux)

## Common Issues

### Port Already in Use

If port 5173 is already in use, you can specify a different port:
```bash
bun run dev --port 3001
```

### TypeScript Errors

If you encounter TypeScript errors:
1. Run `bun run type-check` to see all type errors
2. Make sure all dependencies are installed
3. Check if types are properly imported

### Build Errors

If you encounter build errors:
1. Clear the `dist` directory
2. Run `bun install` to ensure all dependencies are up to date
3. Check for any TypeScript errors
4. Verify environment variables are properly set

## Next Steps

- Read the [Architecture](./ARCHITECTURE.md) documentation
- Explore the [Components](./COMPONENTS.md) documentation
- Check out the [State Management](./STATE_MANAGEMENT.md) guide 