
# Staff Wellbeing Survey Application

## App Overview

The Staff Wellbeing Survey Application is a comprehensive tool designed to help school and college leaders understand and improve staff wellbeing in their educational settings. It enables institutions to create, distribute, and analyse wellbeing surveys, comparing their results against national benchmarks. The application provides actionable insights that senior management teams can use to improve workplace conditions, staff retention, and overall wellbeing, ultimately enhancing the educational environment for both staff and students.

## Core Features and User Flows

* **User Authentication**: Staff members can create accounts, log in, and manage their profiles
* **Survey Creation**: School leaders can create customised wellbeing surveys with standard and custom questions
* **Survey Distribution**: Surveys can be distributed via unique links sent to staff email addresses
* **Anonymous Responses**: Staff can submit anonymous feedback through a user-friendly form
* **Real-time Analytics**: Leaders can view responses in real-time with visual analytics and dashboards
* **Benchmark Comparison**: Results can be compared against national wellbeing benchmarks
* **Action Planning**: Tools to create and track action plans based on survey insights
* **Team Management**: Ability to invite team members with different access levels
* **Subscription Management**: Schools can select and manage different tiers of service

### User Roles

* **Administrator**: Can access all areas of the system, manage user accounts, modify subscription settings, and view payment history. Administrators have full control over the platform's configuration.
* **Organisation Leader**: Can create and manage surveys, view analytics, create action plans, and invite team members within their organisation. Cannot access administrative functions or data from other organisations.
* **Team Member**: Can view surveys and analytics based on permissions granted by Organisation Leaders. Limited ability to create surveys or invite other members.
* **Staff Respondent**: Not a registered user, but can anonymously access and complete surveys via unique links. Cannot access any administrative or analytical features.

Access control is primarily managed through Row Level Security policies that filter data based on user identity (auth.uid()) and user_roles associations.

## Technical Stack and Tools

* **Frontend**:
  * React with TypeScript for type safety
  * Vite as the build tool
  * Tailwind CSS for responsive styling
  * Shadcn UI components for consistent design
  * React Router for navigation
  * React Query for data fetching and state management

* **Backend**:
  * Supabase for authentication, database, and storage
  * PostgreSQL database with Row Level Security
  * Supabase Edge Functions for serverless functionality
  * REST API integration

* **Third-party Services**:
  * Stripe for payment processing
  * Resend for email delivery
  * OpenAI for data analysis insights (optional)
  * HubSpot for CRM integration

## Environment Setup

* **Development Requirements**:
  * Node.js (v18 or higher)
  * npm or Yarn package manager
  * Git for version control
  * Supabase CLI for local development
  * Environment variables for API keys and endpoints

* **Environment Variables**:
  * VITE_SUPABASE_URL: URL of the Supabase project
  * VITE_SUPABASE_ANON_KEY: Anon/Public key from Supabase
  * STRIPE_SECRET_KEY: For payment processing
  * RESEND_API_KEY: For email delivery
  * HUBSPOT_API_KEY: For CRM integration
  * OPENAI_API_KEY: For AI-powered insights (optional)

* **Local Development**:
  * Run the development server with `npm run dev`
  * Connect to Supabase using the CLI
  * Test Edge Functions locally with `supabase functions serve`

## Data Model (Plain English)

* **Users/Profiles**: Stores user information, including name, role, and organisation details
* **Organisations**: Represents schools or colleges using the platform
* **Survey Templates**: Contains survey configuration, including name, status, and closing date
* **Custom Questions**: User-created questions that can be added to surveys
* **Survey Responses**: Anonymous answers submitted by staff members
* **Custom Question Responses**: Answers to custom questions, linked to survey responses
* **Subscriptions**: Tracks the subscription status and plan type for each organisation
* **Payment History**: Records of payments made for subscriptions
* **Action Plan Descriptors**: Items in action plans created based on survey results
* **Action Plan Progress Notes**: Updates on progress made against action plan items

Key relationships:
* Users belong to Organisations
* Organisations create Survey Templates
* Survey Templates have many Survey Responses
* Custom Questions are created by Organisations and can be reused across surveys
* Action Plans are created by Organisations based on survey results

## Supabase Functions and Logic

* **send-survey-email**: Distributes survey links to staff via email
* **send-welcome-email**: Sends onboarding emails to new users
* **send-closure-notification**: Alerts administrators when a survey closes
* **send-analysis-email**: Delivers survey analysis reports
* **generate-survey-summary**: Creates an AI-powered summary of survey results
* **create-payment-session**: Initiates Stripe payment sessions
* **stripe-webhook**: Handles Stripe payment events
* **check-subscription**: Verifies subscription status
* **cancel-subscription**: Processes subscription cancellations
* **update-invoice-status**: Updates payment records
* **hubspot-integration**: Syncs user data with HubSpot CRM

### Supabase Query Standards

* **Use Supabase client methods**: Always use Supabase client methods (e.g. `supabase.from(...).select()`) instead of raw fetch or direct SQL queries
* **Group Supabase interactions**: Collect database interactions into dedicated utility functions for maintainability
* **Row-Level Security**: All queries must be properly scoped using `auth.uid()` to ensure users only access their own data
* **Error handling**: Use async/await with try/catch blocks for all Supabase interactions
* **Return format**: Edge functions should consistently return objects with the structure `{ success, error, data }` for predictable client handling
* **Function isolation**: Move complex logic to Supabase Edge Functions for security and consistent execution, especially when involving external APIs or sensitive operations

## Design Principles and Constraints

* **Mobile-First Design**: All UI components must be designed for mobile devices first, then adapted for larger screens
* **Accessibility**: The application must be accessible to users with disabilities, following WCAG guidelines
* **UK English**: All text content, labels, and documentation must use UK English spelling and terminology
* **Data Security**: All user data must be protected with appropriate Row Level Security policies
* **User Scope**: All database queries must be scoped to the current user via auth.uid()
* **Code Preservation**: Existing components and logic should not be overwritten without explicit instruction
* **Code Reuse**: Always reuse existing functions or modules when adding new features
* **Progressive Enhancement**: Core functionality should work without JavaScript, with enhanced features added for modern browsers
* **Performance**: Initial page loads should be fast, with lazy loading for non-critical content

## Naming Conventions

* **camelCase**: Use for variables, functions, and methods (e.g., `getUserData`, `fetchSurveyResponses`)
* **PascalCase**: Use for components, classes, and interfaces (e.g., `SurveyForm`, `UserProfile`)
* **snake_case**: Use for database tables and columns (e.g., `survey_templates`, `user_id`)
* **kebab-case**: Use for file names and URLs (e.g., `survey-form.tsx`, `/survey-results`)
* **Prefixes**:
  * Use `use` prefix for custom hooks (e.g., `useSubscription`)
  * Use `is` or `has` prefix for boolean variables (e.g., `isLoading`, `hasActiveSubscription`)
  * Use `handle` prefix for event handlers (e.g., `handleSubmit`, `handleSelectChange`)

## Immutable Areas – Do Not Overwrite

* **Authentication Logic**: Do not modify authentication flows, session management, or user role verification
* **Billing and Subscription System**: Leave Stripe integration, webhook processing, and payment handling intact
* **Survey Submission Mechanics**: Preserve the core survey anonymity and response processing system
* **Security Policies**: Do not alter Row Level Security policies or access control mechanisms
* **Core Database Structure**: Maintain the existing table relationships and primary data structures

If you are asked to modify any of these areas:
* Request explicit confirmation before proceeding
* Back up the original implementation for reference
* Make the minimum changes necessary to achieve the requested functionality
* Document all changes thoroughly

## Known Issues and Limitations

* **Edge Function Timeouts**: Some survey analytics calculations may timeout for very large datasets
* **Mobile Portrait Mode**: Some data visualisations are optimised for landscape orientation on mobile devices
* **Email Delivery**: Survey invitations may be marked as spam by some email providers
* **Browser Support**: Full functionality requires modern browsers; limited support for IE11
* **Concurrent Editing**: No real-time collaboration features for simultaneous editing of surveys
* **File Uploads**: Limited to specific file types and sizes
* **Rate Limiting**: API calls are rate-limited to prevent abuse
* **Custom Domain Limitations**: Custom domains require a paid subscription plan
* **Offline Support**: Limited functionality when offline; requires network connection for most features

## Guidelines for Code Generation

* **Check First**: Always check if a component or function already exists before creating one
* **Ask Questions**: Request clarification when requirements are ambiguous
* **Modular Design**: Create small, focused components and functions (under 50 lines where possible)
* **Comments and Documentation**: Include descriptive comments for complex logic
* **Type Safety**: Use TypeScript interfaces and types for all components
* **Error Handling**: Implement appropriate error handling and user feedback
* **Testing Considerations**: Write code that is testable and follows testing best practices
* **Consistent Styling**: Follow the established Tailwind CSS patterns
* **Accessibility**: Include ARIA attributes and ensure keyboard navigation works
* **State Management**: Use React Query for server state and local state for UI interactions
* **Performance**: Consider performance implications, especially for mobile devices
* **Avoid Duplication**: Refactor shared functionality into reusable hooks or utilities
