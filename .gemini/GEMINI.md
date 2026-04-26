# .NET 10 Minimal Web API Development Guide

## Overview
This document outlines best practices, naming conventions, file structure, and development guidelines for .NET 10 Minimal Web APIs. Minimal APIs provide a streamlined approach to building lightweight, high-performance REST APIs with reduced ceremony and boilerplate code.

---

## 1. Project Structure & File Organization

### Standard Directory Layout (Minimal API)
```
MYPROFILE-BACKEND/
├── src/
│   ├── Endpoints/                # Endpoint route handlers
│   │   ├── Users/
│   │   │   ├── CreateUserEndpoint.cs
│   │   │   ├── GetUserEndpoint.cs
│   │   │   ├── GetAllUsersEndpoint.cs
│   │   │   ├── UpdateUserEndpoint.cs
│   │   │   └── DeleteUserEndpoint.cs
│   │   ├── Products/
│   │   └── Health/
│   │
│   ├── Handlers/                 # Request/Response handlers
│   │   ├── UserHandlers.cs
│   │   ├── ProductHandlers.cs
│   │   └── HealthHandlers.cs
│   │
│   ├── Services/                 # Business logic
│   │   ├── IUserService.cs
│   │   ├── UserService.cs
│   │   ├── IProductService.cs
│   │   └── ProductService.cs
│   │
│   ├── Repositories/             # Data access layer
│   │   ├── IUserRepository.cs
│   │   ├── UserRepository.cs
│   │   └── IProductRepository.cs
│   │
│   ├── Models/
│   │   ├── Entities/             # Database entities
│   │   │   ├── User.cs
│   │   │   └── Product.cs
│   │   ├── DTOs/                 # Data Transfer Objects
│   │   │   ├── UserDto.cs
│   │   │   └── ProductDto.cs
│   │   ├── Requests/             # Request models
│   │   │   ├── CreateUserRequest.cs
│   │   │   └── UpdateUserRequest.cs
│   │   └── Responses/            # Response models
│   │       ├── ApiResponse.cs
│   │       └── PaginatedResponse.cs
│   │
│   ├── Middleware/               # Custom middleware
│   │   ├── ExceptionHandlingMiddleware.cs
│   │   └── RequestLoggingMiddleware.cs
│   │
│   ├── Extensions/               # Extension methods
│   │   ├── ServiceCollectionExtensions.cs
│   │   ├── ApplicationBuilderExtensions.cs
│   │   └── EndpointExtensions.cs
│   │
│   ├── Filters/                  # Endpoint filters
│   │   └── ValidationFilter.cs
│   │
│   ├── Validators/               # FluentValidation classes
│   │   ├── CreateUserValidator.cs
│   │   └── UpdateUserValidator.cs
│   │
│   ├── Mappers/                  # AutoMapper profiles
│   │   └── MappingProfile.cs
│   │
│   ├── Constants/                # Constants and enums
│   │   ├── ApiRoutes.cs
│   │   └── ErrorMessages.cs
│   │
│   ├── Exceptions/               # Custom exceptions
│   │   ├── ResourceNotFoundException.cs
│   │   ├── ValidationException.cs
│   │   └── ConflictException.cs
│   │
│   ├── Data/
│   │   ├── ApplicationDbContext.cs
│   │   └── SeedData.cs
│   │
│   ├── appsettings.json
│   ├── appsettings.Development.json
│   ├── appsettings.Production.json
│   ├── Program.cs                # Entry point (bootstrapping)
│   └── myprofile-backend.csproj
│
├── tests/
│   ├── Unit-Testing/           # Unit tests
│   │   ├── Endpoints/
│   │   ├── Handlers/
│   │   ├── Services/
│   │   ├── Validators/
│   │   └── myprofile-backend.tests.csproj
│   │
│   └── Integration-Testing/  # Integration tests
│       ├── Endpoints/
│       ├── API/
│       └── myprofile-backend.integration.tests.csproj
│
├── .github/
│   └── workflows/                    # CI/CD pipelines
│
├── .gitignore
├── Directory.Build.props              # Shared project properties
├── global.json                        # SDK version
└── README.md
```

---
