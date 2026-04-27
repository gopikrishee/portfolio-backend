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

## 2. Naming Conventions

### Endpoint Routes
```csharp
// ✅ GOOD - RESTful, lowercase, plural nouns
app.MapGroup("/api/users")
app.MapGroup("/api/products")
app.MapGroup("/api/orders")
app.MapGroup("/api/categories")

// ❌ BAD - Mixed case, verbs, singular
app.MapGroup("/api/GetUsers")
app.MapGroup("/api/User")
app.MapGroup("/API/USERS")
```

### Handler Method Names
```csharp
// ✅ GOOD - Verb-Noun naming
public static async Task<IResult> GetAllUsers() { }
public static async Task<IResult> GetUserById() { }
public static async Task<IResult> CreateUser() { }
public static async Task<IResult> UpdateUser() { }
public static async Task<IResult> DeleteUser() { }
public static async Task<IResult> GetUsersByStatus() { }

// ❌ BAD
public static async Task<IResult> Users() { }
public static async Task<IResult> UserDetails() { }
public static async Task<IResult> MakeUser() { }
```

### Parameter Naming in Handlers
```csharp
// ✅ GOOD - Dependency injection is automatic
private static async Task<IResult> GetUserById(
    int id,                                  // Route parameter
    string? searchTerm = null,              // Query parameter with default
    IUserService userService = null!)       // Service injection
{
    // Implementation
}

// ✅ GOOD - Request body binding
private static async Task<IResult> CreateUser(
    CreateUserRequest request,              // Automatic body binding
    IValidator<CreateUserRequest> validator = null!)
{
    // Implementation
}

// ❌ BAD - Confusing naming
private static async Task<IResult> GetUserById(
    int user_id,
    string term,
    IUserService svc)
{
}
```
---
