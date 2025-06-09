# Civic Watch Mobile App

A React Native mobile application for tracking bills and representatives, built with Expo and connected to the same Supabase backend as the web app.

## Features

- **Authentication**: Sign in/up with email and password or magic links
- **Bills Tracking**: Browse and track legislative bills
- **Representatives**: View and track your elected officials
- **Real-time Updates**: Stay informed with the latest political developments
- **Cross-platform**: Works on both iOS and Android

## Tech Stack

- **React Native** with Expo for cross-platform mobile development
- **TypeScript** for type safety
- **Supabase** for backend services (auth, database, real-time)
- **React Navigation** for app navigation
- **Expo Secure Store** for secure token storage
- **NativeWind** for styling (Tailwind CSS for React Native)

## Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- EAS CLI (`npm install -g eas-cli`)
- Expo Go app on your device for testing

## Installation

1. **Clone and navigate to the mobile app directory:**
   ```bash
   cd civic-watch-mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory with your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database:**
   Run the database migrations to set up notification tables:
   ```bash
   npm run db:migrate
   ```

## Development

### Running the App

1. **Start the development server:**
   ```bash
   npm start
   ```

2. **Run on specific platforms:**
   ```bash
   npm run ios      # iOS simulator
   npm run android  # Android emulator
   npm run web      # Web browser
   ```

3. **Test on device:**
   - Install Expo Go on your mobile device
   - Scan the QR code from the terminal or Metro bundler

### Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth, etc.)
├── lib/               # Utilities and configuration
│   └── supabase.ts    # Supabase client setup
├── navigation/        # Navigation configuration
├── screens/          # App screens
│   ├── AuthScreen.tsx
│   ├── HomeScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── BillDetailScreen.tsx
│   └── RepresentativeDetailScreen.tsx
└── types/            # TypeScript type definitions
```

## Building for Production

### Development Build

```bash
eas build --platform all --profile development
```

### Production Build

```bash
eas build --platform all --profile production
```

### Submit to App Stores

```bash
eas submit --platform ios
eas submit --platform android
```

## Configuration

### EAS Build Profiles

The app uses EAS (Expo Application Services) for building and deployment. Configuration is in `eas.json`.

### App Configuration

Key configuration in `app.json`:
- App name, slug, and version
- Platform-specific settings
- Bundle identifiers
- Required permissions

## Features Overview

### Authentication
- Email/password login
- Magic link authentication
- Secure token storage using Expo Secure Store
- Automatic session management

### Bills Tracking
- Browse legislative bills
- Search and filter functionality
- Detailed bill information
- Track bills for updates
- Share bills with others

### Representatives
- View elected officials
- Contact information (phone, email, website)
- Track representatives
- Committee memberships
- Recent voting records

### User Profile
- Account management
- Subscription status
- Notification preferences
- Help and support

## Database Schema

The mobile app uses the same Supabase database as the web app:

- `users` - User profiles and settings
- `bills` - Legislative bills and details
- `representatives` - Elected officials information
- `user_tracked_bills` - Bills tracked by users
- `user_tracked_representatives` - Representatives tracked by users
- `user_push_tokens` - Device push notification tokens
- `user_notification_preferences` - User notification settings
- `notification_logs` - Notification event logging

### Database Migrations

The app includes proper database migrations using Supabase CLI:

```bash
# Deploy migrations
npm run db:migrate

# Check migration status  
npm run db:status

# Create a new migration
npm run db:new migration_name
```

See `supabase/migrations/README.md` for detailed migration instructions.

## Styling

The app uses NativeWind (Tailwind CSS for React Native) with a custom dark theme:

- **Primary Colors**: Navy (`#0f1419`) and Civic Blue (`#1e40af`)
- **Dark Theme**: Consistent with the web app
- **Responsive Design**: Optimized for various screen sizes

## Development Notes

### State Management
- React Context for authentication
- React Query for data fetching and caching
- Local state with useState/useEffect hooks

### Navigation
- Stack navigation for screen transitions
- Bottom tab navigation for main sections
- Deep linking support for sharing

### Security
- Secure token storage with Expo Secure Store
- Environment variables for sensitive data
- Proper error handling and validation

## Troubleshooting

### Common Issues

1. **Metro bundler errors**: Clear cache with `npx expo start --clear`
2. **Build failures**: Check EAS build logs and ensure all dependencies are compatible
3. **Authentication issues**: Verify Supabase configuration and environment variables

### Debug Mode

Run in debug mode for detailed logging:
```bash
npx expo start --dev-client
```

## Contributing

1. Follow the existing code style and conventions
2. Use TypeScript for all new files
3. Test on both iOS and Android
4. Update this README for any significant changes

## License

This project is part of the Civic Watch application suite. 