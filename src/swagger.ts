import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TravelMate API',
      version: '1.0.0',
      description:
        'Complete REST API for TravelMate — a ride-sharing platform connecting drivers and riders. ' +
        'Covers authentication, rides, bookings, wallet, KYC, payments, chat, notifications, location and admin operations.',
      contact: {
        name: 'TravelMate Support',
        email: 'support@travelmate.ng',
      },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local development' },
      { url: 'https://api.travelmate.ng', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login or /api/auth/register/address',
        },
      },
      schemas: {
        // ── Shared primitives ──────────────────────────────────────────────────
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Descriptive error message' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 50 },
            total: { type: 'integer', example: 200 },
            totalPages: { type: 'integer', example: 4 },
          },
        },
        // ── Auth / User ────────────────────────────────────────────────────────
        UserPublic: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['rider', 'driver', 'admin'] },
            kycStatus: { type: 'string', enum: ['unverified', 'pending', 'verified', 'rejected'] },
            profilePicture: { type: 'string', format: 'uri', nullable: true },
          },
        },
        AuthToken: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'JWT access token (7-day expiry)' },
            user: { $ref: '#/components/schemas/UserPublic' },
          },
        },
        // ── Rides ──────────────────────────────────────────────────────────────
        RideAmenities: {
          type: 'object',
          properties: {
            ac: { type: 'boolean', default: false },
            music: { type: 'boolean', default: false },
            petAllowed: { type: 'boolean', default: false },
          },
        },
        RideSummary: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            from: { type: 'string', example: 'Lagos Island' },
            to: { type: 'string', example: 'Ikeja' },
            departureTime: { type: 'string', format: 'date-time' },
            pricePerSeat: { type: 'number', example: 1500 },
            availableSeats: { type: 'integer', example: 3 },
            totalSeats: { type: 'integer', example: 4 },
            status: { type: 'string', enum: ['open', 'completed', 'cancelled'] },
            driverId: { type: 'string', format: 'uuid' },
            driver: {
              type: 'object',
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                profilePicture: { type: 'string', format: 'uri', nullable: true },
              },
            },
          },
        },
        RideDetail: {
          allOf: [
            { $ref: '#/components/schemas/RideSummary' },
            {
              type: 'object',
              properties: {
                fromLocation: {
                  type: 'object',
                  properties: { lat: { type: 'number' }, lng: { type: 'number' } },
                },
                toLocation: {
                  type: 'object',
                  properties: { lat: { type: 'number' }, lng: { type: 'number' } },
                },
                bookedSeats: { type: 'integer' },
                description: { type: 'string', nullable: true },
                vehicleMake: { type: 'string', nullable: true, example: 'Toyota' },
                vehicleModel: { type: 'string', nullable: true, example: 'Camry' },
                vehicleColor: { type: 'string', nullable: true, example: 'Silver' },
                amenities: { $ref: '#/components/schemas/RideAmenities' },
              },
            },
          ],
        },
        // ── Bookings ───────────────────────────────────────────────────────────
        BookingSummary: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            rideId: { type: 'string', format: 'uuid' },
            from: { type: 'string' },
            to: { type: 'string' },
            departureTime: { type: 'string', format: 'date-time' },
            seatsBooked: { type: 'integer' },
            totalPrice: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'accepted', 'cancelled', 'completed'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // ── Wallet ─────────────────────────────────────────────────────────────
        WalletBalance: {
          type: 'object',
          properties: {
            totalBalance: { type: 'number', example: 25000 },
            availableBalance: { type: 'number', example: 20000 },
            heldAmount: { type: 'number', example: 5000 },
            pending: { type: 'number', example: 0 },
            totalEarnings: { type: 'number', example: 80000 },
            totalWithdrawn: { type: 'number', example: 55000 },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['payment', 'refund', 'withdrawal', 'wallet_funding', 'payout', 'held'] },
            amount: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'completed', 'failed'] },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // ── KYC ────────────────────────────────────────────────────────────────
        KycStatus: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['unverified', 'pending', 'verified', 'rejected'] },
            data: { type: 'object', additionalProperties: true },
          },
        },
        // ── Chat ───────────────────────────────────────────────────────────────
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            content: { type: 'string' },
            sentAt: { type: 'string', format: 'date-time' },
            isOwn: { type: 'boolean' },
            sender: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                profilePicture: { type: 'string', nullable: true },
              },
            },
          },
        },
        Conversation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            rideId: { type: 'string', format: 'uuid' },
            route: { type: 'string', nullable: true, example: 'Lagos Island → Ikeja' },
            departureTime: { type: 'string', format: 'date-time', nullable: true },
            otherParticipant: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                profilePicture: { type: 'string', nullable: true },
                rating: { type: 'number', nullable: true },
              },
            },
            lastMessage: {
              type: 'object',
              nullable: true,
              properties: {
                content: { type: 'string' },
                sentAt: { type: 'string', format: 'date-time' },
                isOwn: { type: 'boolean' },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // ── Notifications ──────────────────────────────────────────────────────
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            body: { type: 'string' },
            type: { type: 'string' },
            isRead: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    // Global security: all routes require BearerAuth unless overridden
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Health', description: 'Service health check' },
      { name: 'Auth', description: 'Registration, login and profile management' },
      { name: 'Rides', description: 'Create, search and manage rides' },
      { name: 'Bookings', description: 'Book seats and manage bookings' },
      { name: 'Wallet', description: 'Wallet balance, deposits and withdrawals' },
      { name: 'Payments', description: 'Paystack payment initiation, verification and webhooks' },
      { name: 'KYC', description: 'Multi-step identity verification' },
      { name: 'Chat', description: 'In-app messaging between riders and drivers' },
      { name: 'User', description: 'User activity, FCM tokens and notifications' },
      { name: 'Location', description: 'Geocoding and route calculation (Mapbox proxy)' },
      { name: 'Agora', description: 'Real-time voice/video token generation' },
      { name: 'Admin', description: 'Admin-only dashboard, user management and KYC resolution' },
    ],
    paths: {
      // ──────────────────────────────────────────────────────────────────────────
      // HEALTH
      // ──────────────────────────────────────────────────────────────────────────
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          description: 'Returns service status and current timestamp. No authentication required.',
          security: [],
          responses: {
            200: {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      service: { type: 'string', example: 'TravelMate API' },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ──────────────────────────────────────────────────────────────────────────
      // AUTH
      // ──────────────────────────────────────────────────────────────────────────
      '/api/auth/register/start': {
        post: {
          tags: ['Auth'],
          summary: 'Step 1 — Start registration',
          description:
            'Begins the multi-step registration flow. Validates that the email and phone are not already registered, ' +
            'then returns a short-lived session token (24 h) used to carry state through subsequent steps.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'phone'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'ada@example.com' },
                    phone: { type: 'string', example: '+2348012345678', description: 'International format (E.164)' },
                    role: { type: 'string', enum: ['rider', 'driver'], default: 'rider' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Session token issued — proceed to set-password step',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      sessionToken: { type: 'string' },
                      nextStep: { type: 'string', example: 'set-password' },
                    },
                  },
                },
              },
            },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            409: { description: 'Email or phone already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/auth/register/verify-phone': {
        post: {
          tags: ['Auth'],
          summary: 'Step 2 — Verify phone via OTP (optional)',
          description: 'Verifies the 6-digit OTP sent to the user\'s phone and advances the session to the set_password step. This step is optional — the server already advances to set_password in step 1.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['sessionToken', 'otp'],
                  properties: {
                    sessionToken: { type: 'string', description: 'Token from step 1' },
                    otp: { type: 'string', minLength: 6, maxLength: 6, example: '123456' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Phone verified successfully' },
            400: { description: 'Invalid OTP or wrong step', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            401: { description: 'Expired or invalid session token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/auth/register/set-password': {
        post: {
          tags: ['Auth'],
          summary: 'Step 3 — Set password',
          description: 'Sets the account password. Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['sessionToken', 'password'],
                  properties: {
                    sessionToken: { type: 'string' },
                    password: { type: 'string', format: 'password', minLength: 8, example: 'SecurePass@1' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Password saved — proceed to personal-info' },
            400: { description: 'Password does not meet requirements', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            401: { description: 'Invalid/expired session token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/auth/register/personal-info': {
        post: {
          tags: ['Auth'],
          summary: 'Step 4 — Personal information',
          description: 'Saves first name, last name, surname, date of birth (MM/DD/YYYY), and gender to the registration session.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['sessionToken', 'firstName', 'lastName', 'surname', 'dateOfBirth', 'gender'],
                  properties: {
                    sessionToken: { type: 'string' },
                    firstName: { type: 'string', example: 'Ada' },
                    lastName: { type: 'string', example: 'Obi' },
                    surname: { type: 'string', example: 'Obi' },
                    dateOfBirth: { type: 'string', pattern: '^(0[1-9]|1[0-2])/(0[1-9]|[12]\\d|3[01])/\\d{4}$', example: '04/15/1995' },
                    gender: { type: 'string', enum: ['male', 'female', 'other'] },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Personal info saved — proceed to address' },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/auth/register/address': {
        post: {
          tags: ['Auth'],
          summary: 'Step 5 — Address (final step, creates account)',
          description: 'Saves the registered address, creates the user profile in Supabase, initialises the wallet with zero balance, and returns a long-lived JWT.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['sessionToken', 'state', 'localGovt', 'ward', 'street', 'houseNumber'],
                  properties: {
                    sessionToken: { type: 'string' },
                    state: { type: 'string', example: 'Lagos' },
                    localGovt: { type: 'string', example: 'Eti-Osa' },
                    ward: { type: 'string', example: 'Ward 1' },
                    street: { type: 'string', example: '12 Adeola Odeku Street' },
                    houseNumber: { type: 'string', example: '12' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Account created and JWT returned',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthToken' } } },
            },
            400: { description: 'Incomplete session or validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            409: { description: 'Duplicate email/phone race condition', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login with email & password',
          description: 'Authenticates an existing user with their email and password. Returns a JWT valid for 7 days.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', format: 'password' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Login successful',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthToken' } } },
            },
            401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/auth/google': {
        post: {
          tags: ['Auth'],
          summary: 'Login / register via Google OAuth',
          description: 'Authenticates (or creates) an account using a Google OAuth2 access token or ID token. If the user already exists, a JWT is returned. Otherwise, a new account is provisioned automatically.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    credential: { type: 'string', description: 'Google ID token (from Google Sign-In button)' },
                    googleUserInfo: {
                      type: 'object',
                      description: 'Pre-fetched Google userinfo object (email, name, picture)',
                      properties: {
                        email: { type: 'string' },
                        name: { type: 'string' },
                        picture: { type: 'string' },
                      },
                    },
                    role: { type: 'string', enum: ['rider', 'driver'], default: 'rider' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Existing user logged in', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthToken' } } } },
            201: { description: 'New Google account created', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthToken' } } } },
            400: { description: 'Missing credential or invalid role', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            401: { description: 'Invalid Google token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user profile',
          description: 'Returns the authenticated user\'s full profile including address, preferences, trip count, rating, and membership date.',
          responses: {
            200: {
              description: 'Current user profile',
              content: {
                'application/json': {
                  schema: {
                    allOf: [
                      { $ref: '#/components/schemas/UserPublic' },
                      {
                        type: 'object',
                        properties: {
                          address: { type: 'object', additionalProperties: true },
                          preferences: { type: 'object', additionalProperties: true },
                          trips: { type: 'integer' },
                          memberSince: { type: 'string', format: 'date-time' },
                          rating: { type: 'number', nullable: true },
                        },
                      },
                    ],
                  },
                },
              },
            },
            404: { description: 'User not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/auth/preferences': {
        put: {
          tags: ['Auth'],
          summary: 'Update user preferences',
          description: 'Partially updates the authenticated user\'s in-app preferences (AC, music, pets, smoking, auto-accept bookings). Existing preferences are merged — only provided keys are changed.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ac: { type: 'boolean' },
                    music: { type: 'boolean' },
                    pets: { type: 'boolean' },
                    smoking: { type: 'boolean' },
                    autoAccept: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Preferences updated', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, preferences: { type: 'object', additionalProperties: true } } } } } },
          },
        },
      },
      '/api/auth/role': {
        post: {
          tags: ['Auth'],
          summary: 'Switch user role',
          description: 'Switches the active role to "rider" or "driver". Switching to "driver" requires KYC status to be "verified".',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['role'],
                  properties: { role: { type: 'string', enum: ['rider', 'driver'] } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Role switched successfully' },
            403: { description: 'KYC not verified — cannot switch to driver', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/auth/profile': {
        put: {
          tags: ['Auth'],
          summary: 'Edit user profile',
          description: 'Updates editable profile fields: address parts and profile picture URL. Name, email, and phone can only be changed by admins.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  minProperties: 1,
                  properties: {
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    phone: { type: 'string' },
                    street: { type: 'string' },
                    city: { type: 'string' },
                    state: { type: 'string' },
                    localGovt: { type: 'string' },
                    ward: { type: 'string' },
                    houseNumber: { type: 'string' },
                    profilePicture: { type: 'string', format: 'uri' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Profile updated successfully' },
            400: { description: 'No fields provided', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },

      // ──────────────────────────────────────────────────────────────────────────
      // RIDES
      // ──────────────────────────────────────────────────────────────────────────
      '/api/rides': {
        post: {
          tags: ['Rides'],
          summary: 'Create a new ride (driver only)',
          description: 'Allows a driver to post a new ride. Requires the user\'s role to be "driver". Vehicle information and amenities are optional but recommended for rider visibility.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['from', 'to', 'fromLat', 'fromLng', 'toLat', 'toLng', 'departureTime', 'pricePerSeat', 'availableSeats', 'totalSeats'],
                  properties: {
                    from: { type: 'string', example: 'Lagos Island' },
                    to: { type: 'string', example: 'Ikeja' },
                    fromLat: { type: 'number', example: 6.4550 },
                    fromLng: { type: 'number', example: 3.3841 },
                    toLat: { type: 'number', example: 6.6018 },
                    toLng: { type: 'number', example: 3.3515 },
                    departureTime: { type: 'string', format: 'date-time' },
                    pricePerSeat: { type: 'number', example: 1500 },
                    availableSeats: { type: 'integer', example: 3 },
                    totalSeats: { type: 'integer', example: 4 },
                    description: { type: 'string', example: 'Comfortable ride, AC available' },
                    vehicleMake: { type: 'string', example: 'Toyota' },
                    vehicleModel: { type: 'string', example: 'Camry' },
                    vehicleColor: { type: 'string', example: 'Silver' },
                    amenities: { $ref: '#/components/schemas/RideAmenities' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Ride created', content: { 'application/json': { schema: { $ref: '#/components/schemas/RideSummary' } } } },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            403: { description: 'User is not a driver', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/rides/popular': {
        get: {
          tags: ['Rides'],
          summary: 'Get popular routes',
          description: 'Returns the top 4 most popular routes aggregated from open rides with available seats, ranked by total seats across all matching rides.',
          responses: {
            200: {
              description: 'List of popular routes',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      popularRoutes: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            from: { type: 'string' },
                            to: { type: 'string' },
                            minPrice: { type: 'number' },
                            totalSeats: { type: 'integer' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/rides/search': {
        get: {
          tags: ['Rides'],
          summary: 'Search available rides',
          description: 'Search open rides with available seats. Supports two modes:\n\n' +
            '1. **Geospatial search** (when `pickupLat` & `pickupLng` are provided): uses the `search_nearby_rides` Supabase RPC to find rides within a configurable radius.\n' +
            '2. **Text search** (fallback): filters by `from`, `to`, and optional `date` string.',
          parameters: [
            { name: 'from', in: 'query', schema: { type: 'string' }, example: 'Lagos', description: 'Partial text match on departure location' },
            { name: 'to', in: 'query', schema: { type: 'string' }, example: 'Ibadan', description: 'Partial text match on destination' },
            { name: 'date', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Filter rides departing on this date (YYYY-MM-DD)' },
            { name: 'pickupLat', in: 'query', schema: { type: 'number' }, description: 'Rider pickup latitude for geospatial search' },
            { name: 'pickupLng', in: 'query', schema: { type: 'number' }, description: 'Rider pickup longitude for geospatial search' },
            { name: 'pickupRadius', in: 'query', schema: { type: 'number', default: 10 }, description: 'Search radius in km around pickup point' },
            { name: 'dropoffLat', in: 'query', schema: { type: 'number' }, description: 'Rider drop-off latitude (optional for geo search)' },
            { name: 'dropoffLng', in: 'query', schema: { type: 'number' }, description: 'Rider drop-off longitude (optional for geo search)' },
            { name: 'dropoffRadius', in: 'query', schema: { type: 'number', default: 10 }, description: 'Search radius in km around drop-off point' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 }, description: 'Maximum number of results' },
          ],
          responses: {
            200: {
              description: 'Search results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      rides: { type: 'array', items: { $ref: '#/components/schemas/RideSummary' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/rides/driver': {
        get: {
          tags: ['Rides'],
          summary: 'Get rides created by the current driver',
          description: 'Returns all rides created by the authenticated driver, ordered by departure time descending.',
          responses: {
            200: {
              description: 'Driver\'s rides',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { rides: { type: 'array', items: { $ref: '#/components/schemas/RideSummary' } } },
                  },
                },
              },
            },
          },
        },
      },
      '/api/rides/{id}': {
        get: {
          tags: ['Rides'],
          summary: 'Get ride details by ID',
          description: 'Returns full ride details including driver profile, vehicle information, amenities, booking counts and coordinates. Available to any authenticated user.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Ride details', content: { 'application/json': { schema: { $ref: '#/components/schemas/RideDetail' } } } },
            404: { description: 'Ride not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        put: {
          tags: ['Rides'],
          summary: 'Update an open ride (driver only)',
          description: 'Allows the ride owner to update departure time, price, seat count, and description. Only rides with status "open" can be edited.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['departureTime', 'pricePerSeat', 'availableSeats', 'totalSeats'],
                  properties: {
                    departureTime: { type: 'string', format: 'date-time' },
                    pricePerSeat: { type: 'number' },
                    availableSeats: { type: 'integer' },
                    totalSeats: { type: 'integer' },
                    description: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Ride updated' },
            400: { description: 'Ride is not open or validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            403: { description: 'Not the ride owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            404: { description: 'Ride not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/rides/{id}/cancel': {
        post: {
          tags: ['Rides'],
          summary: 'Cancel a ride (driver only)',
          description: 'Cancels the ride and automatically refunds all confirmed riders\' wallet balances. The escrow amounts are also released back to riders.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { reason: { type: 'string', example: 'Car broke down' } },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Ride cancelled and riders refunded',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { message: { type: 'string' }, refundedCount: { type: 'integer' } } },
                },
              },
            },
            403: { description: 'Not the ride owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            404: { description: 'Ride not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/rides/{id}/complete': {
        post: {
          tags: ['Rides'],
          summary: 'Mark a ride as completed (driver only)',
          description: 'Marks the ride as completed, marks all confirmed bookings as completed, releases escrow, and transfers total earnings to the driver\'s wallet.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: {
              description: 'Ride completed and driver paid',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { message: { type: 'string' }, earnings: { type: 'number' } } },
                },
              },
            },
            400: { description: 'Ride is not open', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            403: { description: 'Not the ride owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/rides/{id}/rate': {
        post: {
          tags: ['Rides'],
          summary: 'Rate the driver after a completed ride',
          description: 'Allows a rider who completed the ride to submit a 1–5 star rating and an optional comment. Each rider can only rate a given ride once. The driver\'s profile rating is updated automatically via a DB trigger.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['rating'],
                  properties: {
                    rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
                    comment: { type: 'string', example: 'Very smooth ride, great driver!' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Rating submitted' },
            400: { description: 'Duplicate rating or ride not completed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            403: { description: 'User was not a passenger on this ride', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },

      // ──────────────────────────────────────────────────────────────────────────
      // BOOKINGS
      // ──────────────────────────────────────────────────────────────────────────
      '/api/bookings': {
        post: {
          tags: ['Bookings'],
          summary: 'Create a booking',
          description: 'Books one or more seats on a ride. Two payment paths are supported:\n\n' +
            '- **wallet**: Funds are deducted immediately from the rider\'s wallet and the booking is confirmed in one step.\n' +
            '- **paystack**: A pending booking is created and a Paystack reference is returned. The frontend must redirect the user to Paystack for payment.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['rideId', 'seatsBooked', 'paymentMethod'],
                  properties: {
                    rideId: { type: 'string', format: 'uuid' },
                    seatsBooked: { type: 'integer', minimum: 1, example: 2 },
                    paymentMethod: { type: 'string', enum: ['wallet', 'paystack'] },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Booking created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      rideId: { type: 'string' },
                      seatsBooked: { type: 'integer' },
                      totalPrice: { type: 'number' },
                      status: { type: 'string' },
                      reference: { type: 'string', description: 'Paystack reference (only when paymentMethod is paystack)' },
                    },
                  },
                },
              },
            },
            400: { description: 'Not enough seats or insufficient wallet balance', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            404: { description: 'Ride not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            409: { description: 'Already booked on this ride', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        get: {
          tags: ['Bookings'],
          summary: 'List bookings for the current user',
          description: 'Returns bookings filtered by role. When `role=rider` (default), returns bookings made by the authenticated rider. When `role=driver`, returns bookings on the driver\'s rides.',
          parameters: [
            { name: 'role', in: 'query', schema: { type: 'string', enum: ['rider', 'driver'], default: 'rider' } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'confirmed', 'accepted', 'cancelled', 'completed', 'all'] } },
          ],
          responses: {
            200: {
              description: 'List of bookings',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { bookings: { type: 'array', items: { $ref: '#/components/schemas/BookingSummary' } } },
                  },
                },
              },
            },
          },
        },
      },
      '/api/bookings/{id}': {
        get: {
          tags: ['Bookings'],
          summary: 'Get booking by ID',
          description: 'Returns full booking details. Accessible only by the rider who made the booking or the driver of the associated ride.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Booking details', content: { 'application/json': { schema: { $ref: '#/components/schemas/BookingSummary' } } } },
            403: { description: 'Not authorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            404: { description: 'Booking not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/bookings/{id}/accept': {
        post: {
          tags: ['Bookings'],
          summary: 'Accept a pending booking (driver only)',
          description: 'Allows the driver to accept a pending booking on one of their rides. Only bookings with status "pending" can be accepted.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Booking accepted' },
            400: { description: 'Booking is not pending', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            403: { description: 'Not the ride\'s driver', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/bookings/{id}/cancel': {
        post: {
          tags: ['Bookings'],
          summary: 'Cancel a booking (rider only)',
          description: 'Allows the rider to cancel a pending or confirmed booking. If payment was completed, the full amount is refunded to the rider\'s wallet and the seats are returned to the ride.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { reason: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Booking cancelled',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { message: { type: 'string' }, refundAmount: { type: 'number' } },
                  },
                },
              },
            },
            400: { description: 'Booking cannot be cancelled in its current state', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },

      // ──────────────────────────────────────────────────────────────────────────
      // WALLET
      // ──────────────────────────────────────────────────────────────────────────
      '/api/wallet/balance': {
        get: {
          tags: ['Wallet'],
          summary: 'Get wallet balance',
          description: 'Returns the full financial summary for the authenticated user\'s wallet including total balance, available balance (excluding held amounts), pending withdrawals, total earnings, and total withdrawn.',
          responses: {
            200: { description: 'Wallet balance', content: { 'application/json': { schema: { $ref: '#/components/schemas/WalletBalance' } } } },
            404: { description: 'Wallet not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/wallet/transactions': {
        get: {
          tags: ['Wallet'],
          summary: 'List wallet transactions',
          description: 'Returns a paginated list of the user\'s transactions (payments, refunds, withdrawals, earnings). Filterable by type and status.',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['payment', 'refund', 'withdrawal', 'wallet_funding', 'payout', 'held', 'all'] } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'completed', 'failed', 'all'] } },
          ],
          responses: {
            200: {
              description: 'Transaction list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { transactions: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } }, total: { type: 'integer' } },
                  },
                },
              },
            },
          },
        },
      },
      '/api/wallet/deposit': {
        post: {
          tags: ['Wallet'],
          summary: 'Initiate a wallet deposit',
          description: 'Creates a pending deposit transaction and returns a transaction ID. The frontend should then use this ID as the Paystack reference to complete payment, followed by calling `/api/wallet/deposit/verify`.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['amount', 'paymentMethod'],
                  properties: {
                    amount: { type: 'number', minimum: 1, example: 5000 },
                    paymentMethod: { type: 'string', enum: ['card', 'bank_transfer'] },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Deposit pending',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', description: 'Transaction ID — use as Paystack reference' },
                      amount: { type: 'number' },
                      status: { type: 'string', example: 'pending' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/wallet/deposit/verify': {
        post: {
          tags: ['Wallet'],
          summary: 'Verify and complete a wallet deposit',
          description: 'Verifies the Paystack transaction and credits the user\'s wallet. The `reference` should be the transaction ID returned from `/api/wallet/deposit`.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['reference'],
                  properties: { reference: { type: 'string', description: 'Transaction ID from deposit initiation' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Deposit successful and wallet credited' },
            400: { description: 'Payment not successful or already processed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/wallet/withdraw': {
        post: {
          tags: ['Wallet'],
          summary: 'Withdraw funds to a bank account',
          description: 'Initiates a real NGN bank transfer via Paystack. Creates a transfer recipient, sends the transfer, deducts the wallet balance and records a withdrawal transaction.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['amount', 'bankCode', 'accountNumber'],
                  properties: {
                    amount: { type: 'number', example: 10000 },
                    bankCode: { type: 'string', example: '044', description: 'Paystack bank code (see /api/kyc/banks)' },
                    accountNumber: { type: 'string', example: '0123456789' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Withdrawal initiated or completed',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      amount: { type: 'number' },
                      status: { type: 'string', enum: ['pending', 'completed'] },
                      transferCode: { type: 'string' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            400: { description: 'Insufficient balance or invalid bank details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },

      // ──────────────────────────────────────────────────────────────────────────
      // PAYMENTS
      // ──────────────────────────────────────────────────────────────────────────
      '/api/payments/initiate': {
        post: {
          tags: ['Payments'],
          summary: 'Initiate Paystack payment for a booking',
          description: 'Initialises a Paystack payment for an accepted booking. Returns a Paystack `authorization_url` that the frontend should redirect the user to.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['bookingId', 'email', 'amount'],
                  properties: {
                    bookingId: { type: 'string', format: 'uuid' },
                    email: { type: 'string', format: 'email' },
                    amount: { type: 'number', description: 'Must match booking total price exactly' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Paystack checkout URL returned',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      authorizationUrl: { type: 'string', format: 'uri' },
                      reference: { type: 'string' },
                      accessCode: { type: 'string' },
                    },
                  },
                },
              },
            },
            400: { description: 'Amount mismatch or booking not accepted', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            404: { description: 'Booking not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/payments/verify/{reference}': {
        post: {
          tags: ['Payments'],
          summary: 'Verify a Paystack payment',
          description: 'Verifies a completed Paystack payment by reference, creates an escrow record, confirms the booking, and decrement available seats on the ride. Also sends push notifications to rider and driver.',
          parameters: [{ name: 'reference', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: {
              description: 'Payment verified and booking confirmed',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      bookingId: { type: 'string' },
                      escrowId: { type: 'string' },
                      status: { type: 'string', example: 'confirmed' },
                    },
                  },
                },
              },
            },
            400: { description: 'Payment not successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/payments/webhook/paystack': {
        post: {
          tags: ['Payments'],
          summary: 'Paystack webhook receiver',
          description: 'Receives Paystack webhook events (e.g. `charge.success`). Validates the HMAC-SHA512 signature before processing. Idempotent — already-confirmed bookings are safely ignored.',
          security: [],
          requestBody: {
            content: {
              'application/json': {
                schema: { type: 'object', description: 'Paystack webhook event payload' },
              },
            },
          },
          responses: {
            200: { description: 'Webhook processed' },
            403: { description: 'Invalid Paystack signature', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },

      // ──────────────────────────────────────────────────────────────────────────
      // KYC
      // ──────────────────────────────────────────────────────────────────────────
      '/api/kyc/status': {
        get: {
          tags: ['KYC'],
          summary: 'Get KYC status',
          description: 'Returns the current KYC verification status (`unverified`, `pending`, `verified`, `rejected`) and the accumulated KYC data object.',
          responses: {
            200: { description: 'KYC status', content: { 'application/json': { schema: { $ref: '#/components/schemas/KycStatus' } } } },
          },
        },
      },
      '/api/kyc/step1-identity': {
        post: {
          tags: ['KYC'],
          summary: 'KYC Step 1 — Identity document',
          description: 'Saves the user\'s government-issued ID type (NIN, Passport, Driver\'s Licence, etc.), ID number, and a URL pointing to the uploaded ID document image (stored in Supabase Storage).',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['idType', 'idNumber', 'idDocumentUrl'],
                  properties: {
                    idType: { type: 'string', example: 'NIN', description: 'Type of ID (NIN, Passport, Driver\'s Licence, Voter\'s Card)' },
                    idNumber: { type: 'string', example: '12345678901' },
                    idDocumentUrl: { type: 'string', format: 'uri', description: 'Supabase Storage public URL for the uploaded ID image' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Identity details saved' },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/kyc/step2-address': {
        post: {
          tags: ['KYC'],
          summary: 'KYC Step 2 — Proof of address',
          description: 'Saves a utility bill or address document confirming the user\'s residential address. Accepts electricity or water bills.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['documentType', 'utilityType', 'addressDocumentUrl'],
                  properties: {
                    documentType: { type: 'string', example: 'utility_bill' },
                    utilityType: { type: 'string', enum: ['Electricity', 'Water'] },
                    addressDocumentUrl: { type: 'string', format: 'uri' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Address documents saved' },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/kyc/step3-bank': {
        post: {
          tags: ['KYC'],
          summary: 'KYC Step 3 — Banking details',
          description: 'Records the user\'s bank name, account name, and account number for withdrawal purposes. The account can be pre-verified using `/api/kyc/verify-account`.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['bankName', 'accountName', 'accountNumber'],
                  properties: {
                    bankName: { type: 'string', example: 'Access Bank' },
                    accountName: { type: 'string', example: 'Ada Obi' },
                    accountNumber: { type: 'string', example: '0123456789' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Banking details saved' },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/kyc/step4-face': {
        post: {
          tags: ['KYC'],
          summary: 'KYC Step 4 — Face verification (final submission)',
          description: 'Final KYC step. Saves the face selfie URL, sets KYC status to "pending", updates the profile picture, and creates a `kyc_submissions` record for the admin team to review. Steps 1 and 2 must be completed first.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['faceImageUrl'],
                  properties: {
                    faceImageUrl: { type: 'string', format: 'uri', description: 'Supabase Storage URL for the face selfie image' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'KYC submitted for review', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, status: { type: 'string', example: 'pending' } } } } } },
            400: { description: 'Previous steps incomplete', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/kyc/verify-account': {
        post: {
          tags: ['KYC'],
          summary: 'Verify bank account number in real-time',
          description: 'Resolves an account number via the Paystack Bank API and returns the verified account name. Useful for confirming account details before saving in Step 3.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['accountNumber', 'bankCode'],
                  properties: {
                    accountNumber: { type: 'string', example: '0123456789' },
                    bankCode: { type: 'string', example: '044' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Account resolved',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      accountName: { type: 'string' },
                      accountNumber: { type: 'string' },
                      bankCode: { type: 'string' },
                      valid: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            400: { description: 'Account could not be verified', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/kyc/banks': {
        get: {
          tags: ['KYC'],
          summary: 'List supported Nigerian banks',
          description: 'Fetches the current list of Nigerian banks and their Paystack bank codes from the Paystack API. Used to populate bank selection dropdowns.',
          responses: {
            200: {
              description: 'List of banks',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      banks: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            code: { type: 'string', example: '044' },
                            name: { type: 'string', example: 'Access Bank' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ──────────────────────────────────────────────────────────────────────────
      // CHAT
      // ──────────────────────────────────────────────────────────────────────────
      '/api/chat': {
        get: {
          tags: ['Chat'],
          summary: 'List all conversations',
          description: 'Returns all conversations for the authenticated user, including the route, the other participant\'s profile, and the last message sent in each conversation.',
          responses: {
            200: {
              description: 'Conversation list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { conversations: { type: 'array', items: { $ref: '#/components/schemas/Conversation' } } },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Chat'],
          summary: 'Start or retrieve a conversation',
          description: 'Starts a new conversation between the rider (caller) and the driver of the given ride. If a conversation already exists for this ride + rider pair, the existing conversation ID is returned.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['rideId'],
                  properties: { rideId: { type: 'string', format: 'uuid' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Existing conversation returned', content: { 'application/json': { schema: { type: 'object', properties: { conversationId: { type: 'string' }, existing: { type: 'boolean', example: true } } } } } },
            201: { description: 'New conversation created', content: { 'application/json': { schema: { type: 'object', properties: { conversationId: { type: 'string' }, existing: { type: 'boolean', example: false } } } } } },
            400: { description: 'Driver cannot message themselves', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/chat/{conversationId}/messages': {
        get: {
          tags: ['Chat'],
          summary: 'Get message history for a conversation',
          description: 'Returns paginated messages for a conversation. Only participants (rider or driver) can access the conversation.',
          parameters: [
            { name: 'conversationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            200: {
              description: 'Message list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      conversationId: { type: 'string' },
                      messages: { type: 'array', items: { $ref: '#/components/schemas/Message' } },
                    },
                  },
                },
              },
            },
            403: { description: 'Not a participant in this conversation', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            404: { description: 'Conversation not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        post: {
          tags: ['Chat'],
          summary: 'Send a message in a conversation',
          description: 'Sends a text message in a conversation. Only conversation participants can send messages.',
          parameters: [{ name: 'conversationId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['content'],
                  properties: { content: { type: 'string', minLength: 1, maxLength: 2000, example: 'Hi, I\'m on my way to the pickup point!' } },
                },
              },
            },
          },
          responses: {
            201: { description: 'Message sent', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } },
            403: { description: 'Not a participant', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },

      // ──────────────────────────────────────────────────────────────────────────
      // USER
      // ──────────────────────────────────────────────────────────────────────────
      '/api/user/activity': {
        get: {
          tags: ['User'],
          summary: 'Get user activity statistics',
          description: 'Returns dashboard statistics for the authenticated user: total and completed bookings as rider, total and active rides as driver, and average rating.',
          responses: {
            200: {
              description: 'Activity statistics',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      totalBookings: { type: 'integer' },
                      completedBookings: { type: 'integer' },
                      averageRating: { type: 'number', example: 4.8 },
                      totalRides: { type: 'integer', description: 'Rides driven as a driver' },
                      activeDriverRides: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/user/fcm-token': {
        post: {
          tags: ['User'],
          summary: 'Register or update FCM device token',
          description: 'Registers a Firebase Cloud Messaging (FCM) device token for push notifications. Upserts the token per user-device combination.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token'],
                  properties: {
                    token: { type: 'string', description: 'FCM device token from Firebase SDK' },
                    deviceType: { type: 'string', enum: ['ios', 'android', 'web'], example: 'android' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Token registered' },
            400: { description: 'Token is required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/user/notifications': {
        get: {
          tags: ['User'],
          summary: 'Get notification history',
          description: 'Returns the last 50 notifications for the authenticated user, ordered by newest first.',
          responses: {
            200: {
              description: 'Notification list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { notifications: { type: 'array', items: { $ref: '#/components/schemas/Notification' } } },
                  },
                },
              },
            },
          },
        },
      },
      '/api/user/notifications/read-all': {
        put: {
          tags: ['User'],
          summary: 'Mark all notifications as read',
          description: 'Sets `is_read = true` on all unread notifications belonging to the authenticated user.',
          responses: {
            200: { description: 'All notifications marked as read' },
          },
        },
      },
      '/api/user/notifications/{id}/read': {
        put: {
          tags: ['User'],
          summary: 'Mark a single notification as read',
          description: 'Sets `is_read = true` on a specific notification. Only works for notifications belonging to the authenticated user.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Notification marked as read' },
          },
        },
      },
      '/api/user/activity-feed': {
        get: {
          tags: ['User'],
          summary: 'Get unified activity feed',
          description: 'Returns a chronologically merged feed of recent driver bookings, transactions and notifications for the authenticated user. Useful for the home dashboard.',
          parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 30, default: 10 } }],
          responses: {
            200: {
              description: 'Activity feed',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      feed: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            kind: { type: 'string', enum: ['booking', 'completed', 'cancelled', 'payment', 'withdrawal', 'notification'] },
                            text: { type: 'string' },
                            time: { type: 'string', format: 'date-time' },
                            icon: { type: 'string' },
                            color: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },

      // ──────────────────────────────────────────────────────────────────────────
      // LOCATION
      // ──────────────────────────────────────────────────────────────────────────
      '/api/location/autocomplete': {
        get: {
          tags: ['Location'],
          summary: 'Location autocomplete (Mapbox proxy)',
          description: 'Proxies the query to the Mapbox Geocoding API and returns place suggestions. Used for the "from" and "to" search inputs in the ride creation and search forms.',
          parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string', minLength: 2 }, example: 'Ikeja', description: 'Search query (minimum 2 characters)' }],
          responses: {
            200: {
              description: 'Autocomplete results',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { results: { type: 'array', items: { type: 'object' } } } },
                },
              },
            },
            400: { description: 'Query too short', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/location/route': {
        get: {
          tags: ['Location'],
          summary: 'Get route directions (Mapbox proxy)',
          description: 'Calculates a driving route between two coordinates using the Mapbox Directions API. Returns polyline data for rendering on a map.',
          parameters: [
            { name: 'fromLng', in: 'query', required: true, schema: { type: 'number' }, example: 3.3841 },
            { name: 'fromLat', in: 'query', required: true, schema: { type: 'number' }, example: 6.4550 },
            { name: 'toLng', in: 'query', required: true, schema: { type: 'number' }, example: 3.3515 },
            { name: 'toLat', in: 'query', required: true, schema: { type: 'number' }, example: 6.6018 },
          ],
          responses: {
            200: { description: 'Route data', content: { 'application/json': { schema: { type: 'object', properties: { route: { type: 'object' } } } } } },
            404: { description: 'Route not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },

      // ──────────────────────────────────────────────────────────────────────────
      // AGORA
      // ──────────────────────────────────────────────────────────────────────────
      '/api/agora/token': {
        get: {
          tags: ['Agora'],
          summary: 'Generate Agora RTC token',
          description: 'Generates a short-lived Agora Real-Time Communication (RTC) token for joining a voice/video channel. Tokens default to 1-hour expiry.',
          parameters: [
            { name: 'channel', in: 'query', required: true, schema: { type: 'string' }, example: 'ride_abc123', description: 'Agora channel name (e.g. the ride ID)' },
            { name: 'uid', in: 'query', schema: { type: 'integer', default: 0 }, description: 'User ID; 0 = anonymous' },
            { name: 'role', in: 'query', schema: { type: 'string', enum: ['publisher', 'subscriber'], default: 'publisher' } },
            { name: 'expire', in: 'query', schema: { type: 'integer', default: 3600 }, description: 'Token TTL in seconds' },
          ],
          responses: {
            200: {
              description: 'Agora token',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' },
                      appId: { type: 'string' },
                      channel: { type: 'string' },
                      uid: { type: 'integer' },
                      role: { type: 'string' },
                      expireAt: { type: 'integer', description: 'Unix timestamp when token expires' },
                    },
                  },
                },
              },
            },
            500: { description: 'Agora not configured', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },

      // ──────────────────────────────────────────────────────────────────────────
      // ADMIN
      // ──────────────────────────────────────────────────────────────────────────
      '/api/admin/stats': {
        get: {
          tags: ['Admin'],
          summary: 'Dashboard statistics (admin only)',
          description: 'Returns platform-wide counts: total users, active rides, pending KYC submissions, total payouts, and estimated platform revenue.',
          responses: {
            200: {
              description: 'Platform statistics',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      totalUsers: { type: 'integer' },
                      activeRides: { type: 'integer' },
                      pendingKyc: { type: 'integer' },
                      totalPayouts: { type: 'number' },
                      estimatedRevenue: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/admin/users': {
        get: {
          tags: ['Admin'],
          summary: 'List all users (admin only)',
          description: 'Returns a paginated list of all users. Supports search by email, first name, or last name.',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name or email' },
          ],
          responses: {
            200: {
              description: 'User list with pagination',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      users: { type: 'array', items: { $ref: '#/components/schemas/UserPublic' } },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/admin/users/{id}': {
        get: {
          tags: ['Admin'],
          summary: 'Get full user profile (admin only)',
          description: 'Returns the full user profile including wallet balance, the 5 most recent rides driven, and the 10 most recent transactions.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'Full user profile' },
            404: { description: 'User not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/admin/users/{id}/status': {
        put: {
          tags: ['Admin'],
          summary: 'Update user account status (admin only)',
          description: 'Sets a user\'s account status to `active`, `suspended`, or `banned`. Admins cannot change their own status.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: { status: { type: 'string', enum: ['active', 'suspended', 'banned'] } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Status updated' },
            400: { description: 'Cannot change own status', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/admin/kyc': {
        get: {
          tags: ['Admin'],
          summary: 'List pending KYC submissions (admin only)',
          description: 'Returns all users with KYC status "pending", ordered by submission date. Supports search by name or email.',
          parameters: [{ name: 'search', in: 'query', schema: { type: 'string' } }],
          responses: {
            200: { description: 'Pending KYC submissions' },
          },
        },
      },
      '/api/admin/kyc/{id}/resolve': {
        post: {
          tags: ['Admin'],
          summary: 'Approve or reject a KYC submission (admin only)',
          description: 'Approves or rejects a user\'s KYC submission. On approval, `kyc_status` is set to "verified". On rejection, a reason is required and stored.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'User ID whose KYC is being resolved' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['action'],
                  properties: {
                    action: { type: 'string', enum: ['approve', 'reject'] },
                    reason: { type: 'string', description: 'Required when action is "reject"' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'KYC resolved' },
            400: { description: 'Validation error (missing reason for rejection)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/admin/rides': {
        get: {
          tags: ['Admin'],
          summary: 'List all rides (admin only)',
          description: 'Returns a paginated list of all rides with driver information. Filterable by status and searchable by route or driver name.',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'completed', 'cancelled'] } },
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by route or driver name' },
          ],
          responses: {
            200: {
              description: 'Ride list with pagination',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      rides: { type: 'array', items: { $ref: '#/components/schemas/RideSummary' } },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/admin/rides/{id}/cancel': {
        post: {
          tags: ['Admin'],
          summary: 'Force-cancel a ride (admin only)',
          description: 'Cancels an open ride and automatically refunds all confirmed riders. Escrows are marked as refunded.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: { type: 'object', properties: { reason: { type: 'string', example: 'Driver account suspended' } } },
              },
            },
          },
          responses: {
            200: { description: 'Ride cancelled and riders refunded' },
            400: { description: 'Ride is not open', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/admin/bookings': {
        get: {
          tags: ['Admin'],
          summary: 'List all bookings (admin only)',
          description: 'Returns a paginated list of all bookings with passenger and ride details. Filterable by status and searchable by passenger name, email, or route.',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'confirmed', 'accepted', 'cancelled', 'completed'] } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            200: {
              description: 'Booking list with pagination',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      bookings: { type: 'array', items: { $ref: '#/components/schemas/BookingSummary' } },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/admin/transactions': {
        get: {
          tags: ['Admin'],
          summary: 'List all transactions (admin only)',
          description: 'Returns a paginated list of all platform transactions with user information. Filterable by transaction type.',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['payment', 'refund', 'withdrawal', 'wallet_funding', 'payout', 'held'] } },
          ],
          responses: {
            200: {
              description: 'Transaction list with pagination',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      transactions: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/admin/settings': {
        get: {
          tags: ['Admin'],
          summary: 'Get app settings (admin only)',
          description: 'Returns all key-value pairs from the `app_settings` table, ordered alphabetically by key.',
          responses: {
            200: { description: 'App settings' },
            404: { description: 'Settings table not found — run migration', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        put: {
          tags: ['Admin'],
          summary: 'Update app settings (admin only)',
          description: 'Bulk-updates one or more settings. Pass a key-value object where each key is a setting name (e.g. `MAPBOX_ACCESS_TOKEN`) and the value is the new string value.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', additionalProperties: { type: 'string' }, example: { PLATFORM_FEE_PERCENT: '10' } },
              },
            },
          },
          responses: {
            200: { description: 'Settings updated' },
          },
        },
      },
      '/api/admin/broadcast-notification': {
        post: {
          tags: ['Admin'],
          summary: 'Broadcast push notification (admin only)',
          description: 'Sends a push notification to a single user, all drivers, all riders, or all users on the platform.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['target', 'title', 'body'],
                  properties: {
                    target: { type: 'string', enum: ['all', 'drivers', 'riders', 'individual'] },
                    userId: { type: 'string', format: 'uuid', description: 'Required when target is "individual"' },
                    title: { type: 'string', example: 'System Maintenance Tonight' },
                    body: { type: 'string', example: 'The app will be unavailable from 2–4 AM.' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Notification sent',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { message: { type: 'string' } } },
                },
              },
            },
            400: { description: 'Missing required fields', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
    },
  },
  apis: [], // All definitions are inline above — no JSDoc scanning needed
};

export const swaggerSpec = swaggerJSDoc(options);
