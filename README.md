# DREAMONEIR - Dream Interpretation & Journal

A modern, AI-powered dream interpretation and journaling application built with Next.js 15, TypeScript, and Supabase.

## Features

- 🧠 **AI-Powered Dream Interpretation** - Get professional insights into your dreams
- 📊 **Sleep Tracking** - Track sleep hours and their impact on dreams
- 📚 **Dream History** - Build a personal dream journal with search functionality
- 🔍 **Pattern Recognition** - Discover recurring symbols, emotions, and themes
- 🎨 **Beautiful UI** - Modern, app-like interface with glassmorphism design
- 🔐 **User Authentication** - Secure login/signup with Supabase Auth
- 📱 **Mobile Responsive** - Works perfectly on all devices

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Supabase
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: Groq (Llama 3.3 70B)
- **Deployment**: Vercel-ready

## Getting Started

### 1. Clone the repository
```bash
git clone <repository-url>
cd dreamoneir
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
3. Copy your project URL and keys from Supabase settings

### 4. Set up Groq API

1. Sign up for a free account at [console.groq.com](https://console.groq.com)
2. Create an API key from the dashboard
3. Copy your API key for the next step

### 5. Environment variables
Create a `.env.local` file with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Groq AI
GROQ_API_KEY=your_groq_api_key
```

### 6. Run the development server
```bash
npm run dev
```

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (server-side only)
- `GROQ_API_KEY`: Your Groq API key for AI dream interpretation

## Database Schema

The app uses two main tables:

### `profiles`
- User profile information linked to Supabase Auth
- Stores user metadata like full name, avatar, etc.

### `dreams`
- Dream entries with AI interpretations
- Includes sleep hours, symbols, emotions, and themes
- Row Level Security ensures users can only access their own dreams

## API Routes

- `/api/interpret-dream-supabase` - AI dream interpretation
- `/api/dreams-supabase` - User dream history
- `/api/dreams-supabase/patterns` - Pattern analysis

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

The app is fully optimized for Vercel deployment with:

- ✅ Serverless functions
- ✅ Edge runtime compatible
- ✅ Environment variable support
- ✅ Automatic SSL
- ✅ Global CDN

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial use.