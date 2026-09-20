# Zyndex

## Secure Microservices-Based Digital Publishing and Access Control Platform

Zyndex is a cloud-native digital publishing and educational resource
platform developed for the **ScholarSphere Digital** use case.

The platform enables users to discover, access, read, and manage digital
books, academic journals, research documents, and other educational
resources while enforcing authentication, authorization, digital rights,
subscription-based access, and usage tracking.

The system is implemented using a **React + Vite frontend** and a
**Spring Boot / Spring Cloud microservices backend** with **JWT
authentication, API Gateway routing, Eureka service discovery, load
balancing, independent databases, secure resource delivery, usage
analytics, and subscription management**.

------------------------------------------------------------------------

## Problem Statement

ScholarSphere Digital requires an online publishing and access-control
platform for delivering digital books, academic journals, and research
documents to subscription-based users.

The platform must:

-   Control access to digital content
-   Enforce granular digital rights and permissions
-   Prevent unauthorized access and downloads
-   Track reading history and user activity
-   Record engagement metrics
-   Support subscription-based access
-   Provide secure API endpoints
-   Support service discovery and load balancing
-   Handle continuous content and reading traffic
-   Maintain independent microservices
-   Support unit and integration testing
-   Provide a scalable deployment architecture

Zyndex addresses these requirements through a distributed microservices
architecture.

------------------------------------------------------------------------

# Key Features

-   JWT-based authentication and authorization
-   Secure API Gateway
-   Eureka service discovery
-   Client-side load balancing through service discovery
-   Digital content catalog management
-   Secure digital resource streaming
-   Short-lived resource preview/download tokens
-   Digital rights and entitlement management
-   Subscription-based content access
-   Reading history tracking
-   View and download tracking
-   Reading-duration tracking
-   Usage analytics
-   Resource ratings and feedback
-   User profiles
-   OTP-based authentication workflows
-   Role-based access control
-   Payment and subscription workflow
-   Independent databases for services
-   REST-based inter-service communication
-   Unit and integration testing
-   React-based responsive frontend

------------------------------------------------------------------------

# Design Thinking and Innovation

Zyndex was designed using a user-centered approach.

The design process focused on understanding how students, researchers,
and academic users interact with digital educational resources.

## Empathy Mapping

The user perspective was analyzed through four major dimensions.

### Says

-   "I need the right resource quickly."
-   "I want to know whether I can access the content."
-   "I want my reading history to be available."
-   "I should be able to download content when permitted."

### Thinks

-   "Is this resource available to me?"
-   "Is my account secure?"
-   "Can I find this resource again?"
-   "Why is this content restricted?"

### Does

-   Searches for resources
-   Views resource information
-   Reads digital content
-   Downloads permitted resources
-   Reviews previous activity
-   Saves useful resources

### Feels

-   Frustrated when access is unclear
-   Concerned about security
-   Satisfied when resources are easy to access
-   Confident when permissions are clearly enforced

------------------------------------------------------------------------

# User Persona

## Academic Resource Explorer

**Role:** Undergraduate Student / Research Learner

### Goals

-   Find academic resources quickly
-   Read digital books and research documents
-   Access authorized resources securely
-   Maintain reading history
-   Download permitted resources
-   Return to previously accessed content

### Pain Points

-   Unclear access permissions
-   Difficulty tracking previously accessed resources
-   Unauthorized or broken download links
-   Slow resource delivery
-   Repeated authentication requirements

### Expectations

-   Simple user interface
-   Secure authentication
-   Fast content delivery
-   Clear permission status
-   Reading history
-   Reliable resource access

------------------------------------------------------------------------

# Customer Journey

The Zyndex user journey follows these stages:

### 1. Discover

The user searches for books, journals, research documents, and other
digital resources.

**System Response:** The Content Service provides resource information,
categories, and search functionality.

### 2. Evaluate

The user opens a resource and reviews its information.

**System Response:** Resource metadata and relevant information are
displayed.

### 3. Authenticate

The user logs into the platform.

**System Response:** The Auth Service validates the user's credentials
and generates a JWT.

### 4. Request Access

The user attempts to open protected content.

**System Response:** The Access Service verifies the user's entitlement
and permissions.

### 5. Read

The user accesses authorized digital content.

**System Response:** The Content Service securely delivers the resource.

### 6. Track Activity

The user views, reads, or downloads content.

**System Response:** The Usage Service records relevant activity.

### 7. Return

The user returns to previously accessed resources.

**System Response:** Reading and usage history can be retrieved.

### 8. Manage

The user saves or favorites useful resources.

**System Response:** The platform maintains saved resources for future
access.

### Journey Summary

``` text
Discover
   ↓
Evaluate
   ↓
Authenticate
   ↓
Request Access
   ↓
Read
   ↓
Track Activity
   ↓
Return
   ↓
Manage Resources
```

------------------------------------------------------------------------

# System Architecture

Zyndex follows a **Spring Cloud microservices architecture**.

``` text
                         ┌─────────────────────────┐
                         │     React + Vite        │
                         │       Frontend          │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │       API Gateway       │
                         │        Port 8080        │
                         │   JWT + Routing + CORS  │
                         └────────────┬────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
 ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
 │   Auth Service  │       │ Content Service │       │  Access Service │
 │    Port 8081    │       │    Port 8082    │       │    Port 8083    │
 └────────┬────────┘       └────────┬────────┘       └────────┬────────┘
          │                         │                         │
          ▼                         ▼                         ▼
 ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
 │  Auth Database  │       │ Content Database│       │ Access Database │
 │  zyndex_auth    │       │ zyndex_content  │       │  zyndex_access  │
 └─────────────────┘       └─────────────────┘       └─────────────────┘
                                    │
                                    ▼
                           ┌─────────────────┐
                           │  Usage Service  │
                           │    Port 8084    │
                           └────────┬────────┘
                                    │
                                    ▼
                           ┌─────────────────┐
                           │  Usage Database │
                           │  zyndex_usage   │
                           └─────────────────┘

                           ┌─────────────────┐
                           │  Subscription   │
                           │     Service     │
                           │    Port 8085    │
                           └────────┬────────┘
                                    │
                                    ▼
                           ┌──────────────────────┐
                           │ Subscription Database│
                           │  zyndex_subscription │
                           └──────────────────────┘

                     ┌───────────────────────────┐
                     │       Eureka Server       │
                     │         Port 8761         │
                     │ Service Discovery /       │
                     │ Load Balancing Foundation │
                     └───────────────────────────┘
```

------------------------------------------------------------------------

# Microservices

## 1. Eureka Server

**Port:** `8761`

The Eureka Server provides service discovery for the microservices.

### Responsibilities

-   Service registration
-   Service discovery
-   Dynamic service lookup
-   Support for scalable service instances

------------------------------------------------------------------------

## 2. API Gateway

**Port:** `8080`

The API Gateway is the single entry point for frontend requests.

### Responsibilities

-   API routing
-   JWT validation
-   CORS handling
-   Request forwarding
-   User identity propagation
-   Load-balanced service routing
-   Centralized gateway security

### Main Routes

``` text
/api/auth/**           → AUTH-SERVICE
/api/users/**          → AUTH-SERVICE
/api/send-otp         → AUTH-SERVICE
/api/verify-otp       → AUTH-SERVICE

/api/resources/**     → CONTENT-SERVICE
/api/feedback/**      → CONTENT-SERVICE

/api/access/**        → ACCESS-SERVICE

/api/usage/**         → USAGE-SERVICE

/api/subscriptions/** → SUBSCRIPTION-SERVICE
/api/payments/**      → SUBSCRIPTION-SERVICE
/api/webhooks/**      → SUBSCRIPTION-SERVICE
```

------------------------------------------------------------------------

# 3. Auth Service

**Port:** `8081`

The Auth Service manages authentication and user identity.

### Responsibilities

-   User registration
-   User login
-   JWT generation
-   User profiles
-   OTP generation
-   OTP verification
-   Password management
-   Role information
-   Authentication-related operations

### Database

``` text
zyndex_auth
```

------------------------------------------------------------------------

# 4. Content Service

**Port:** `8082`

The Content Service manages digital resources and their metadata.

### Responsibilities

-   Digital resource catalog
-   Resource creation
-   Resource retrieval
-   Resource search
-   Categories
-   Resource metadata
-   File uploads
-   Secure file streaming
-   Preview access
-   Download access
-   Ratings
-   Feedback
-   Resource-related operations

### Security Feature

The service supports short-lived resource access mechanisms instead of
relying only on permanent public file URLs.

### Database

``` text
zyndex_content
```

------------------------------------------------------------------------

# 5. Access Service

**Port:** `8083`

The Access Service provides digital rights and entitlement management.

### Responsibilities

-   Permission checking
-   User-resource entitlements
-   Permission assignment
-   Permission revocation
-   Access expiration
-   Access status
-   Authorization decisions

### Database

``` text
zyndex_access
```

The Access Service separates authorization logic from content
management.

------------------------------------------------------------------------

# 6. Usage Service

**Port:** `8084`

The Usage Service records user activity and engagement.

### Responsibilities

-   View tracking
-   Download tracking
-   Reading activity
-   Reading duration
-   User history
-   Usage statistics
-   Engagement metrics
-   Popular resource analysis

### Database

``` text
zyndex_usage
```

------------------------------------------------------------------------

# 7. Subscription Service

**Port:** `8085`

The Subscription Service manages subscription-related functionality.

### Responsibilities

-   Subscription plans
-   User subscriptions
-   Subscription status
-   Subscription expiry
-   Checkout workflows
-   Payment workflows
-   Payment integration
-   Payment webhooks
-   Subscription-related notifications

### Payment

The service supports Razorpay integration and includes a configurable
payment mode.

### Database

``` text
zyndex_subscription
```

------------------------------------------------------------------------

# Authentication Flow

Zyndex uses JWT-based authentication.

``` text
User
  │
  ▼
Login
  │
  ▼
Auth Service
  │
  ▼
JWT Generated
  │
  ▼
Frontend
  │
  ▼
Authorization Header
  │
  ▼
API Gateway
  │
  ▼
JWT Validation
  │
  ▼
User Claims
  │
  ▼
Microservice
```

The API Gateway validates the JWT before forwarding protected requests.

After successful validation, trusted user information can be forwarded
to downstream services.

------------------------------------------------------------------------

# Digital Rights Management

One of the core principles of Zyndex is separating content management
from access control.

``` text
                 Digital Resource
                        │
                        ▼
                 Content Service
                        │
                        ▼
                 Access Service
                        │
                        ▼
              Permission / Entitlement
                        │
                ┌───────┴───────┐
                │               │
              Allow             Deny
                │               │
                ▼               ▼
          Deliver Content    Reject Access
```

The Access Service determines whether the user has permission to access
the requested resource.

This prevents the Content Service from becoming responsible for all
authorization rules.

------------------------------------------------------------------------

# Service Integration

The major service interaction flow is:

``` text
Frontend
   │
   ▼
API Gateway
   │
   ▼
Content Service
   │
   ▼
Access Service
   │
   ▼
Permission Check
   │
   ▼
Authorized Content
   │
   ▼
Usage Service
   │
   ▼
Activity Recorded
```

The architecture keeps individual service responsibilities separated
while allowing them to cooperate through REST APIs and service
discovery.

------------------------------------------------------------------------

# Data Architecture

Zyndex follows an independent-database approach for its major
microservices.

``` text
Auth Service
     │
     ▼
zyndex_auth

Content Service
     │
     ▼
zyndex_content

Access Service
     │
     ▼
zyndex_access

Usage Service
     │
     ▼
zyndex_usage

Subscription Service
     │
     ▼
zyndex_subscription
```

This reduces direct database coupling between services and supports
independent service development and scaling.

------------------------------------------------------------------------

# Technology Stack

## Frontend

-   React
-   Vite
-   JavaScript / TypeScript
-   React Router
-   Axios
-   Material UI
-   Tailwind CSS
-   Recharts
-   Lucide React
-   Motion

## Backend

-   Java 21
-   Spring Boot 3.4.3
-   Spring Cloud 2024.0.1
-   Spring Security
-   Spring Cloud Gateway
-   Spring Cloud Netflix Eureka
-   REST APIs
-   Maven

## Database

-   MySQL

## Authentication & Security

-   JWT
-   Spring Security
-   Role-based access control
-   Gateway-level authentication
-   Protected REST endpoints
-   Short-lived content access tokens

## Content Processing

-   Apache PDFBox

## Payments

-   Razorpay

## Email / OTP

-   Spring Mail
-   SMTP
-   OTP-based workflows

------------------------------------------------------------------------

# Project Structure

``` text
Zyndex/
│
├── access-service/
│   ├── src/
│   └── pom.xml
│
├── api-gateway/
│   ├── src/
│   └── pom.xml
│
├── auth-service/
│   ├── src/
│   └── pom.xml
│
├── content-service/
│   ├── src/
│   └── pom.xml
│
├── eureka-server/
│   ├── src/
│   └── pom.xml
│
├── subscription-service/
│   ├── src/
│   └── pom.xml
│
├── usage-service/
│   ├── src/
│   └── pom.xml
│
├── src/
│   └── main.tsx
│
├── public/
│
├── package.json
├── pom.xml
├── mvnw
├── mvnw.cmd
├── vite.config.ts
├── netlify.toml
├── vercel.json
├── Use Case.md
└── README.md
```

------------------------------------------------------------------------

# Database Setup

Make sure MySQL is installed and running.

Create the required databases:

``` sql
CREATE DATABASE IF NOT EXISTS zyndex_auth;
CREATE DATABASE IF NOT EXISTS zyndex_content;
CREATE DATABASE IF NOT EXISTS zyndex_access;
CREATE DATABASE IF NOT EXISTS zyndex_usage;
CREATE DATABASE IF NOT EXISTS zyndex_subscription;
```

Each microservice uses its own database.

------------------------------------------------------------------------

# Environment Variables

Create a `.env` file or configure environment variables in the
deployment environment.

Important variables include:

``` env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_database_password

JWT_SECRET=your_long_random_jwt_secret

FRONTEND_URL=http://localhost:5173

MAIN_ADMIN_EMAIL=your_admin_email
MAIN_ADMIN_PASSWORD=your_admin_password
MAIN_ADMIN_NAME=Main Admin

OTP_SMTP_HOST=
OTP_SMTP_PORT=587
OTP_SMTP_USER=
OTP_SMTP_PASS=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

PAYMENT_MODE=SIMULATED
```

Do not commit real passwords, JWT secrets, API keys, database
credentials, payment credentials, or SMTP credentials to GitHub.

------------------------------------------------------------------------

# Running the Project Locally

## Prerequisites

Install:

-   Java 21
-   Maven or use the included Maven Wrapper
-   Node.js
-   npm
-   MySQL

------------------------------------------------------------------------

## Step 1: Clone the Repository

``` bash
git clone <YOUR_REPOSITORY_URL>
cd Zyndex
```

------------------------------------------------------------------------

## Step 2: Configure MySQL

Create the required databases:

``` sql
CREATE DATABASE IF NOT EXISTS zyndex_auth;
CREATE DATABASE IF NOT EXISTS zyndex_content;
CREATE DATABASE IF NOT EXISTS zyndex_access;
CREATE DATABASE IF NOT EXISTS zyndex_usage;
CREATE DATABASE IF NOT EXISTS zyndex_subscription;
```

Configure the database credentials through environment variables.

------------------------------------------------------------------------

## Step 3: Build the Backend

### Windows

``` powershell
.\mvnw.cmd clean package -DskipTests
```

### Linux / macOS

``` bash
./mvnw clean package -DskipTests
```

------------------------------------------------------------------------

## Step 4: Start Eureka Server

``` bash
java -jar eureka-server/target/eureka-server-1.0.0.jar
```

Eureka Dashboard:

``` text
http://localhost:8761
```

------------------------------------------------------------------------

## Step 5: Start API Gateway

``` bash
java -jar api-gateway/target/api-gateway-1.0.0.jar
```

Gateway:

``` text
http://localhost:8080
```

------------------------------------------------------------------------

## Step 6: Start Auth Service

``` bash
java -jar auth-service/target/auth-service-1.0.0.jar
```

Service:

``` text
http://localhost:8081
```

------------------------------------------------------------------------

## Step 7: Start Content Service

``` bash
java -jar content-service/target/content-service-1.0.0.jar
```

Service:

``` text
http://localhost:8082
```

------------------------------------------------------------------------

## Step 8: Start Access Service

``` bash
java -jar access-service/target/access-service-1.0.0.jar
```

Service:

``` text
http://localhost:8083
```

------------------------------------------------------------------------

## Step 9: Start Usage Service

``` bash
java -jar usage-service/target/usage-service-1.0.0.jar
```

Service:

``` text
http://localhost:8084
```

------------------------------------------------------------------------

## Step 10: Start Subscription Service

``` bash
java -jar subscription-service/target/subscription-service-1.0.0.jar
```

Service:

``` text
http://localhost:8085
```

------------------------------------------------------------------------

# Frontend Setup

Install the frontend dependencies:

``` bash
npm install
```

Start the Vite development server:

``` bash
npm run dev
```

The frontend will normally be available at:

``` text
http://localhost:5173
```

------------------------------------------------------------------------

# Run Frontend and Backend Together

The project includes a helper script for starting the development
environment:

``` bash
npm run dev:all
```

Frontend-only development:

``` bash
npm run dev
```

Frontend build:

``` bash
npm run build
```

------------------------------------------------------------------------

# API Gateway Access

The frontend should communicate with the backend through the API Gateway
rather than directly accessing individual microservices.

``` text
Frontend
   │
   ▼
http://localhost:8080
   │
   ├── /api/auth/**
   ├── /api/users/**
   ├── /api/resources/**
   ├── /api/access/**
   ├── /api/usage/**
   ├── /api/subscriptions/**
   ├── /api/payments/**
   └── /api/webhooks/**
```

------------------------------------------------------------------------

# Testing

The project includes Spring Boot testing support and service-level
tests.

Run tests using:

``` bash
.\mvnw.cmd test
```

or:

``` bash
./mvnw test
```

To build without executing tests:

``` bash
.\mvnw.cmd clean package -DskipTests
```

Testing covers service functionality and selected integration behavior.

------------------------------------------------------------------------

# Load Balancing and Service Discovery

Zyndex uses Eureka for service registration and discovery.

Each microservice registers with:

``` text
http://localhost:8761/eureka/
```

The API Gateway uses load-balanced service URIs such as:

``` text
lb://AUTH-SERVICE
lb://CONTENT-SERVICE
lb://ACCESS-SERVICE
lb://USAGE-SERVICE
lb://SUBSCRIPTION-SERVICE
```

This allows the gateway to discover service instances dynamically
instead of relying on fixed backend URLs.

------------------------------------------------------------------------

# Security Architecture

Security is implemented at multiple levels.

### Authentication

JWT-based authentication is used to establish the identity of the user.

### Gateway Protection

The API Gateway validates JWT tokens before forwarding protected
requests.

### Authorization

The Access Service verifies whether the authenticated user has
permission to access a resource.

### Content Protection

Digital resources are delivered through controlled access mechanisms,
including short-lived resource tokens.

### Database Isolation

Each major microservice maintains an independent database.

### Secret Management

Sensitive values such as:

-   Database passwords
-   JWT secrets
-   SMTP credentials
-   Razorpay credentials
-   API keys

should be provided through environment variables rather than committed
to source control.

------------------------------------------------------------------------

# Innovative Ideas

## 1. Short-Lived Content Access

Digital resources can be accessed through controlled, short-lived
preview or download tokens instead of permanent public URLs.

## 2. Independent Digital Rights Management

Authorization is separated from content management, allowing permission
rules to evolve independently.

## 3. Usage-Based Personalization

Reading history and engagement data provide a foundation for future
personalized resource recommendations.

``` text
Reading History
      ↓
Usage Patterns
      ↓
Content Categories
      ↓
Personalized Recommendations
```

## 4. Subscription-Aware Access

Subscription status can be connected to resource entitlements.

``` text
User
 ↓
Subscription
 ↓
Entitlement
 ↓
Resource Access
```

## 5. Independent Service Scaling

Different services can be scaled independently depending on traffic
requirements.

For example, heavy content-reading traffic does not necessarily require
authentication services to scale at the same rate.

## 6. Analytics-Driven Content Management

Usage data can help identify:

-   Frequently accessed resources
-   Download activity
-   Reading patterns
-   Engagement levels
-   Popular academic categories

------------------------------------------------------------------------

# Functional Flow

The overall platform workflow can be summarized as:

``` text
                    USER
                      │
                      ▼
              React + Vite
                      │
                      ▼
                API Gateway
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
       Auth       Content       Access
       Service    Service       Service
          │           │           │
          │           └─────┬─────┘
          │                 │
          │                 ▼
          │          Permission Check
          │                 │
          │                 ▼
          │          Authorized Content
          │                 │
          │                 ▼
          │           Usage Service
          │                 │
          │                 ▼
          │           Usage Metrics
          │
          ▼
       JWT Auth

                Subscription Service
                         │
                         ▼
                Subscription / Payment
```

------------------------------------------------------------------------

# Project Requirements Mapping

  Requirement                      Implementation
  -------------------------------- --------------------------------------
  JWT Authentication               Auth Service + API Gateway
  Digital Content Management       Content Service
  Access Control                   Access Service
  Reading History                  Usage Service
  Usage Tracking                   Usage Service
  Unauthorized Access Prevention   JWT + Access Service
  Service Discovery                Eureka Server
  API Routing                      Spring Cloud Gateway
  Load Balancing                   Spring Cloud LoadBalancer
  Subscription Management          Subscription Service
  Payment Workflow                 Razorpay Integration
  Independent Databases            Service-specific MySQL databases
  Secure Content Delivery          Content Service + short-lived tokens
  Unit Testing                     Spring Boot Test
  Integration Testing              Service-level integration support
  Frontend                         React + Vite

------------------------------------------------------------------------

# Team

## Zyndex

  Role          Student ID   Name
  ------------- ------------ ---------------------------
  Team Lead     2400030952   GALI BHAANU
  Team Member   2400030485   RAGE DHEERAJ KUMAR
  Team Member   2400030872   GOLI VEERA VENKATA CHARAN

------------------------------------------------------------------------

# Project Information

**Project Name:** Zyndex

**Use Case:** ScholarSphere Digital

**Domain:** Digital Publishing and Educational Resources

**Architecture:** Microservices

**Frontend:** React + Vite

**Backend:** Spring Boot + Spring Cloud

**Database:** MySQL

**Authentication:** JWT

**Service Discovery:** Eureka

**API Gateway:** Spring Cloud Gateway

**Payment Integration:** Razorpay

**Java Version:** 21

**Spring Boot Version:** 3.4.3

**Spring Cloud Version:** 2024.0.1

------------------------------------------------------------------------

# Future Enhancements

Potential future improvements include:

-   AI-powered resource recommendations
-   Advanced content analytics
-   Full-text document search
-   More granular digital rights policies
-   Multi-region deployment
-   Containerized deployment using Docker
-   Kubernetes orchestration
-   Automated CI/CD pipelines
-   Distributed tracing
-   Centralized monitoring
-   Redis-based caching
-   Event-driven usage processing
-   Advanced subscription tiers
-   Enhanced anti-download and content protection mechanisms

------------------------------------------------------------------------

# Conclusion

Zyndex demonstrates how a user-centered digital publishing platform can
be implemented using a secure and scalable microservices architecture.

The system separates authentication, content management, access control,
usage tracking, subscription management, service discovery, and API
routing into independent components.

The architecture combines:

``` text
Design Thinking
       +
User-Centered Requirements
       +
Microservices
       +
JWT Security
       +
Digital Rights Management
       +
Service Discovery
       +
Load Balancing
       +
Usage Analytics
       +
Subscription Management
       =
Zyndex
```

Zyndex provides a foundation for a secure digital learning ecosystem
where users can discover and consume academic resources while the
platform maintains control over authentication, authorization, digital
rights, subscriptions, and engagement data.

------------------------------------------------------------------------

# License

This project is developed as an academic/project implementation for the
ScholarSphere Digital use case.

------------------------------------------------------------------------

# Authors

**GALI BHAANU**\
Team Lead --- Zyndex

**RAGE DHEERAJ KUMAR**\
Team Member --- Zyndex

**GOLI VEERA VENKATA CHARAN**\
Team Member --- Zyndex
