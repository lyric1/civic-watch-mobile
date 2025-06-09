#!/bin/bash

# Civic Watch - Database Migration Deployment Script
# This script helps deploy database migrations to Supabase

set -e

echo "🚀 Civic Watch - Database Migration Deployment"
echo "=============================================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're logged in to Supabase
if ! supabase status &> /dev/null; then
    echo "🔐 Please log in to Supabase first:"
    echo "   supabase login"
    read -p "Press enter after logging in..."
fi

# Check if project is linked
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo "🔗 Project not linked to Supabase."
    echo "Please provide your Supabase project reference."
    echo "You can find this in your dashboard URL: https://supabase.com/dashboard/project/YOUR_PROJECT_REF"
    read -p "Enter your project reference: " PROJECT_REF
    
    if [ -z "$PROJECT_REF" ]; then
        echo "❌ Project reference is required."
        exit 1
    fi
    
    echo "🔗 Linking to project: $PROJECT_REF"
    supabase link --project-ref "$PROJECT_REF"
fi

# Show current migration status
echo "📊 Current migration status:"
supabase migration list

echo ""
read -p "Do you want to deploy pending migrations? (y/N): " DEPLOY

if [ "$DEPLOY" = "y" ] || [ "$DEPLOY" = "Y" ]; then
    echo "🚀 Deploying migrations..."
    
    # Deploy migrations
    if supabase db push; then
        echo "✅ Migrations deployed successfully!"
        echo ""
        echo "📊 Updated migration status:"
        supabase migration list
        echo ""
        echo "🎉 Your notification system is now set up!"
        echo ""
        echo "Next steps:"
        echo "1. Test the app to ensure notifications work"
        echo "2. Configure your notification sending service"
        echo "3. Set up proper environment variables for push notifications"
    else
        echo "❌ Migration deployment failed. Please check the errors above."
        exit 1
    fi
else
    echo "⏭️  Skipping migration deployment."
    echo ""
    echo "To deploy manually, run:"
    echo "   supabase db push"
fi

echo ""
echo "📚 For more information, see supabase/migrations/README.md" 