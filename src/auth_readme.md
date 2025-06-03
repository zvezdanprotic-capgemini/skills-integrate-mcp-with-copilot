# Authentication System Documentation

## Overview

This document provides details on the authentication system implemented for the Mergington High School Activities API. The system provides secure user authentication, role-based access control, and protected API endpoints.

## Features

- User registration with secure password hashing
- JWT-based authentication
- Role-based access control (Student, Advisor, Admin)
- Protected API endpoints
- Frontend integration with authentication flow

## User Roles

- **Student**: Can view activities and sign up for activities
- **Advisor**: Can perform student actions + unregister students from activities
- **Admin**: Full system access

## API Endpoints

### Authentication

- `POST /token`: Obtain JWT authentication token
- `POST /users/register`: Register a new student user
- `GET /users/me`: Get current authenticated user information

### Activities

- `GET /activities`: List all activities (public)
- `POST /activities/{activity_name}/signup`: Sign up for an activity (requires authentication)
- `DELETE /activities/{activity_name}/unregister`: Unregister from an activity (requires advisor or admin role)

## Implementation Details

### Backend

- Password hashing using bcrypt
- JWT tokens for authentication
- Role-based permission checking using FastAPI dependencies
- User data stored in JSON file (can be replaced with database in future)

### Frontend

- Token storage using localStorage
- Login and registration modals
- Automatic UI updates based on authentication state
- Protected actions (signup/unregister)

## Default Credentials

The system is initialized with a default admin user:

- Email: admin@mergington.edu
- Password: adminpassword

## Future Improvements

- Move to database storage instead of JSON file
- Add password reset functionality
- Implement refresh tokens for better security
- Add more granular permissions
