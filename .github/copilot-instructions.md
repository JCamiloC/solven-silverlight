# Help Desk Application (Mesa de Ayuda) - Copilot Instructions

This project is a Next.js 15 (App Router) Help Desk application with Supabase integration, designed following ISO 27001 principles.

## Project Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui + Radix UI
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **State Management**: React Query/SWR
- **Deployment**: Serverless-first

### User Roles
- **Cliente**: Basic ticket creation and viewing
- **Agente de Soporte**: Ticket handling and basic CRUD operations
- **Líder de Soporte**: Team management and advanced operations
- **Administrador**: Full system access and configuration

### Module Structure
- **Auth**: Role-based authentication with Supabase
- **Hardware**: Asset management with maintenance logs and PDF generation
- **Software**: License tracking and maintenance
- **Accesos**: Credential and access log management
- **Reportes**: Client-specific dashboards and reports
- **Tickets**: Complete support ticket workflow

## Development Guidelines

### Code Organization
- Use clean architecture with modular design
- Implement reusable UI components
- Follow TypeScript best practices
- Use Supabase RLS for security
- Implement optimistic updates for better UX

### Component Guidelines
- All components should be typed with TypeScript
- Use shadcn/ui as base component library
- Implement proper error handling
- Follow accessibility best practices
- Use Lucide icons consistently

### API Design
- Use Supabase client with proper service roles
- Implement RLS policies for data security
- Use Edge Functions for complex operations
- Follow RESTful principles for API routes

### Security Considerations
- Implement proper authentication flows
- Use RLS for database security
- Validate all inputs
- Follow ISO 27001 principles
- Secure credential management in Accesos module