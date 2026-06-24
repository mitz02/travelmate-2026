const spec = {
  openapi: '3.0.3',
  info: {
    title: 'TravelMate Ride-Sharing API',
    version: '1.0.0',
    description: 'REST API for the TravelMate ride-sharing platform. Supports user authentication, ride management, bookings, wallet operations, escrow, KYC, bill payments, real-time chat, route feed, and more.',
  },
  servers: [
    { url: '/', description: 'Local dev server (relative)' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', description: 'Error message' },
        },
        required: ['error'],
      },
      Success: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
        },
      },

      // ─── Auth ──────────────────────────────────────────────
      SignupInput: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email', description: 'Email address (required if phone not provided)' },
          phone: { type: 'string', minLength: 10, description: 'Phone number (required if email not provided)' },
          password: { type: 'string', minLength: 6 },
          role: { type: 'string', enum: ['rider', 'driver', 'admin'], default: 'rider' },
          fullName: { type: 'string', description: 'Full name' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
        },
      },
      SigninInput: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email', description: 'Email (required if phone not provided)' },
          phone: { type: 'string', minLength: 10, description: 'Phone (required if email not provided)' },
          password: { type: 'string' },
        },
      },
      SignoutInput: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'Refresh token to invalidate' },
        },
      },
      RefreshInput: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      },
      VerifyOtpInput: {
        type: 'object',
        required: ['phone', 'firebaseIdToken'],
        properties: {
          phone: { type: 'string', minLength: 10 },
          firebaseIdToken: { type: 'string', description: 'Firebase ID token from phone auth' },
        },
      },
      ResetPasswordInput: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email' } },
      },
      ChangePasswordInput: {
        type: 'object',
        required: ['oldPassword', 'newPassword'],
        properties: {
          oldPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 6 },
        },
      },
      SwitchRoleInput: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['rider', 'driver', 'admin'] },
        },
      },
      GoogleAuthInput: {
        type: 'object',
        required: ['credential'],
        properties: {
          credential: { type: 'string', description: 'Google access token or credential' },
          googleUserInfo: {
            type: 'object',
            properties: {
              sub: { type: 'string' },
              email: { type: 'string', format: 'email' },
              name: { type: 'string' },
              given_name: { type: 'string' },
              family_name: { type: 'string' },
              picture: { type: 'string', format: 'uri' },
            },
          },
          role: { type: 'string', enum: ['rider', 'driver'], default: 'rider' },
        },
      },
      AuthSession: {
        type: 'object',
        properties: {
          access_token: { type: 'string' },
          refresh_token: { type: 'string' },
          expires_in: { type: 'integer' },
          user: { $ref: '#/components/schemas/UserProfile' },
        },
      },
      UserProfile: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string' },
          phone: { type: 'string' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          role: { type: 'string' },
          avatar_url: { type: 'string' },
          is_verified: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },

      // ─── Ride ──────────────────────────────────────────────
      CreateRideInput: {
        type: 'object',
        required: ['from', 'to', 'departureTime', 'pricePerSeat', 'availableSeats', 'totalSeats'],
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          fromLat: { type: 'number' },
          fromLng: { type: 'number' },
          toLat: { type: 'number' },
          toLng: { type: 'number' },
          departureTime: { type: 'string', format: 'date-time' },
          pricePerSeat: { type: 'number', minimum: 0 },
          availableSeats: { type: 'integer', minimum: 1 },
          totalSeats: { type: 'integer', minimum: 1 },
          description: { type: 'string' },
          vehicleMake: { type: 'string' },
          vehicleModel: { type: 'string' },
          vehicleColor: { type: 'string' },
          ac: { type: 'boolean' },
          music: { type: 'boolean' },
          pets: { type: 'boolean' },
          smoking: { type: 'boolean' },
          pickupPoints: { type: 'array', items: { type: 'string' } },
          dropoffPoints: { type: 'array', items: { type: 'string' } },
        },
      },
      UpdateRideInput: {
        type: 'object',
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          departureTime: { type: 'string', format: 'date-time' },
          pricePerSeat: { type: 'number' },
          availableSeats: { type: 'integer' },
          totalSeats: { type: 'integer' },
          description: { type: 'string' },
        },
      },
      CancelRideInput: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
        },
      },
      Ride: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          driver_id: { type: 'string' },
          from: { type: 'string' },
          to: { type: 'string' },
          departure_time: { type: 'string', format: 'date-time' },
          price_per_seat: { type: 'number' },
          available_seats: { type: 'integer' },
          total_seats: { type: 'integer' },
          status: { type: 'string', enum: ['open', 'active', 'cancelled', 'completed'] },
          description: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },

      // ─── Booking ───────────────────────────────────────────
      CreateBookingInput: {
        type: 'object',
        required: ['rideId', 'seats', 'paymentMethod'],
        properties: {
          rideId: { type: 'string', format: 'uuid' },
          seats: { type: 'integer', minimum: 1 },
          paymentMethod: { type: 'string', description: 'wallet or paystack' },
        },
      },
      CancelBookingInput: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
        },
      },
      PayBookingInput: {
        type: 'object',
        required: ['paymentMethod'],
        properties: {
          paymentMethod: { type: 'string' },
          amount: { type: 'number', minimum: 0 },
        },
      },
      RateBookingInput: {
        type: 'object',
        required: ['rating', 'role'],
        properties: {
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          review: { type: 'string' },
          role: { type: 'string', enum: ['rider', 'driver'] },
        },
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          ride_id: { type: 'string' },
          rider_id: { type: 'string' },
          seats_booked: { type: 'integer' },
          total_price: { type: 'number' },
          status: { type: 'string', enum: ['pending', 'accepted', 'confirmed', 'cancelled', 'completed'] },
          payment_status: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },

      // ─── Wallet ────────────────────────────────────────────
      FundWalletInput: {
        type: 'object',
        required: ['amount', 'paymentMethod'],
        properties: {
          amount: { type: 'number', minimum: 1 },
          paymentMethod: { type: 'string' },
        },
      },
      VerifyPaymentInput: {
        type: 'object',
        required: ['reference'],
        properties: { reference: { type: 'string' } },
      },
      WithdrawInput: {
        type: 'object',
        required: ['amount', 'bankCode', 'bankName', 'accountNumber', 'accountName'],
        properties: {
          amount: { type: 'number', minimum: 100 },
          bankCode: { type: 'string' },
          bankName: { type: 'string' },
          accountNumber: { type: 'string', minLength: 10 },
          accountName: { type: 'string' },
        },
      },
      ResolveAccountInput: {
        type: 'object',
        required: ['bankCode', 'accountNumber'],
        properties: {
          bankCode: { type: 'string' },
          accountNumber: { type: 'string', minLength: 10 },
        },
      },
      TransferInput: {
        type: 'object',
        required: ['toUserId', 'amount'],
        properties: {
          toUserId: { type: 'string', format: 'uuid' },
          amount: { type: 'number', minimum: 0.01 },
          note: { type: 'string' },
        },
      },
      FreezeWalletInput: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
        },
      },
      Wallet: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string' },
          balance: { type: 'number' },
          ledger_balance: { type: 'number' },
          held_amount: { type: 'number' },
          total_earnings: { type: 'number' },
          status: { type: 'string', enum: ['active', 'frozen'] },
          created_at: { type: 'string', format: 'date-time' },
        },
      },

      // ─── Escrow ────────────────────────────────────────────
      HoldEscrowInput: {
        type: 'object',
        required: ['bookingId', 'amount', 'fromUserId', 'toUserId'],
        properties: {
          bookingId: { type: 'string', format: 'uuid' },
          amount: { type: 'number', minimum: 0 },
          fromUserId: { type: 'string', format: 'uuid' },
          toUserId: { type: 'string', format: 'uuid' },
        },
      },
      ReleaseEscrowInput: {
        type: 'object',
        required: ['releasedBy'],
        properties: {
          releasedBy: { type: 'string', format: 'uuid' },
        },
      },
      RefundEscrowInput: {
        type: 'object',
        properties: {
          reason: { type: 'string' },
        },
      },
      DisputeEscrowInput: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string' },
          details: { type: 'string' },
        },
      },
      ResolveEscrowInput: {
        type: 'object',
        required: ['resolution', 'releasedTo'],
        properties: {
          resolution: { type: 'string' },
          releasedTo: { type: 'string', enum: ['from', 'to'] },
        },
      },

      // ─── Payment ───────────────────────────────────────────
      InitPaymentInput: {
        type: 'object',
        required: ['amount', 'email'],
        properties: {
          amount: { type: 'number', minimum: 1 },
          email: { type: 'string', format: 'email' },
          metadata: { type: 'object' },
        },
      },
      ChargeCardInput: {
        type: 'object',
        required: ['card', 'amount', 'email'],
        properties: {
          card: { type: 'string' },
          amount: { type: 'number' },
          email: { type: 'string', format: 'email' },
        },
      },
      SaveCardInput: {
        type: 'object',
        required: ['authorizationCode', 'last4', 'exp'],
        properties: {
          authorizationCode: { type: 'string' },
          last4: { type: 'string', minLength: 4, maxLength: 4 },
          exp: { type: 'string' },
        },
      },

      // ─── KYC ───────────────────────────────────────────────
      SubmitKycInput: {
        type: 'object',
        required: ['idType', 'idNumber', 'bankName', 'bankCode', 'accountNumber', 'accountName'],
        properties: {
          idType: { type: 'string', description: 'ID document type' },
          idNumber: { type: 'string', description: 'ID document number' },
          idFront: { type: 'string', description: 'Front image URL' },
          idBack: { type: 'string', description: 'Back image URL' },
          selfie: { type: 'string', description: 'Selfie image URL' },
          idDocumentUrl: { type: 'string' },
          documentType: { type: 'string' },
          utilityType: { type: 'string' },
          addressDocumentUrl: { type: 'string' },
          bankName: { type: 'string' },
          bankCode: { type: 'string' },
          accountNumber: { type: 'string', minLength: 10 },
          accountName: { type: 'string' },
          faceImageUrl: { type: 'string' },
        },
      },
      VerifyAccountInput: {
        type: 'object',
        required: ['accountNumber', 'bankCode'],
        properties: {
          accountNumber: { type: 'string' },
          bankCode: { type: 'string' },
        },
      },
      FaceVerificationInput: {
        type: 'object',
        required: ['selfie'],
        properties: {
          selfie: { type: 'string', description: 'Selfie image URL' },
          livenessData: { type: 'object' },
        },
      },
      VerifyIdInput: {
        type: 'object',
        required: ['documentType', 'documentUrl'],
        properties: {
          documentType: { type: 'string' },
          documentUrl: { type: 'string', format: 'uri' },
        },
      },
      AdminApproveInput: {
        type: 'object',
        properties: {
          notes: { type: 'string' },
        },
      },
      AdminRejectInput: {
        type: 'object',
        required: ['reason'],
        properties: {
          reason: { type: 'string' },
        },
      },

      // ─── Search Chatter ────────────────────────────────────
      RequestInput: {
        type: 'object',
        required: ['origin', 'destination', 'date', 'seats'],
        properties: {
          origin: { type: 'string' },
          destination: { type: 'string' },
          date: { type: 'string', format: 'date' },
          seats: { type: 'integer', minimum: 1 },
          maxPrice: { type: 'number' },
        },
      },
      OfferInput: {
        type: 'object',
        required: ['price', 'departureTime', 'vehicleId'],
        properties: {
          price: { type: 'number', minimum: 0 },
          departureTime: { type: 'string', format: 'date-time' },
          vehicleId: { type: 'string', format: 'uuid' },
        },
      },

      // ─── Route Feed ────────────────────────────────────────
      StatusInput: {
        type: 'object',
        required: ['route'],
        properties: {
          route: { type: 'string' },
          content: { type: 'string' },
          image: { type: 'string', format: 'uri' },
          type: { type: 'string', enum: ['text', 'image', 'update'], default: 'text' },
        },
      },
      CommentInput: {
        type: 'object',
        required: ['content'],
        properties: { content: { type: 'string', minLength: 1 } },
      },
      ReactInput: {
        type: 'object',
        required: ['type'],
        properties: { type: { type: 'string' }, example: 'like' },
      },

      // ─── Emergency ─────────────────────────────────────────
      SosInput: {
        type: 'object',
        required: ['userId', 'location'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          location: {
            type: 'object',
            required: ['lat', 'lng'],
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' },
              address: { type: 'string' },
            },
          },
          bookingId: { type: 'string', format: 'uuid' },
        },
      },
      AddContactInput: {
        type: 'object',
        required: ['name', 'phone'],
        properties: {
          name: { type: 'string', minLength: 1 },
          phone: { type: 'string', minLength: 10 },
          relationship: { type: 'string' },
        },
      },
      UpdateContactInput: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          phone: { type: 'string' },
          relationship: { type: 'string' },
        },
      },

      // ─── Tracking ──────────────────────────────────────────
      TrackingStartInput: {
        type: 'object',
        required: ['driverLocation'],
        properties: {
          driverLocation: {
            type: 'object',
            required: ['lat', 'lng'],
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      LocationUpdateInput: {
        type: 'object',
        required: ['lat', 'lng'],
        properties: {
          lat: { type: 'number' },
          lng: { type: 'number' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      DeviationInput: {
        type: 'object',
        required: ['bookingId', 'reason'],
        properties: {
          bookingId: { type: 'string', format: 'uuid' },
          reason: { type: 'string' },
        },
      },

      // ─── Chats ─────────────────────────────────────────────
      CreateChatInput: {
        type: 'object',
        required: ['participantIds'],
        properties: {
          participantIds: { type: 'array', items: { type: 'string', format: 'uuid' }, minItems: 1 },
          bookingId: { type: 'string', format: 'uuid' },
        },
      },
      SendMessageInput: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['text', 'image', 'file'], default: 'text' },
          mediaUrl: { type: 'string', format: 'uri' },
        },
      },
      TypingInput: {
        type: 'object',
        required: ['isTyping'],
        properties: {
          isTyping: { type: 'boolean' },
        },
      },

      // ─── Notifications ─────────────────────────────────────
      SendNotificationInput: {
        type: 'object',
        required: ['userId', 'title'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          body: { type: 'string' },
          data: { type: 'object' },
        },
      },
      RegisterTokenInput: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string' },
          device: { type: 'string' },
        },
      },
      UnregisterTokenInput: {
        type: 'object',
        required: ['token'],
        properties: { token: { type: 'string' } },
      },

      // ─── Bills ─────────────────────────────────────────────
      BuyAirtimeInput: {
        type: 'object',
        required: ['phone', 'amount', 'network'],
        properties: {
          phone: { type: 'string', minLength: 10 },
          amount: { type: 'number', minimum: 1 },
          network: { type: 'string' },
        },
      },
      BuyDataInput: {
        type: 'object',
        required: ['phone', 'plan', 'network', 'amount'],
        properties: {
          phone: { type: 'string', minLength: 10 },
          plan: { type: 'string' },
          network: { type: 'string' },
          amount: { type: 'number', minimum: 1 },
        },
      },
      PayElectricityInput: {
        type: 'object',
        required: ['meterNumber', 'amount', 'provider'],
        properties: {
          meterNumber: { type: 'string' },
          amount: { type: 'number', minimum: 1 },
          provider: { type: 'string' },
          meterType: { type: 'string' },
        },
      },
      VerifyMeterInput: {
        type: 'object',
        required: ['meterNumber', 'provider'],
        properties: {
          meterNumber: { type: 'string' },
          provider: { type: 'string' },
        },
      },

      // ─── Ratings ───────────────────────────────────────────
      CreateRatingInput: {
        type: 'object',
        required: ['toUserId', 'fromUserId', 'bookingId', 'rating', 'role'],
        properties: {
          toUserId: { type: 'string', format: 'uuid' },
          fromUserId: { type: 'string', format: 'uuid' },
          bookingId: { type: 'string', format: 'uuid' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          role: { type: 'string', enum: ['rider', 'driver'] },
          comment: { type: 'string', maxLength: 500 },
        },
      },
      UpdateRatingInput: {
        type: 'object',
        properties: {
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          comment: { type: 'string' },
        },
      },

      // ─── Referral & Promo ──────────────────────────────────
      ApplyCodeInput: {
        type: 'object',
        required: ['code'],
        properties: { code: { type: 'string' } },
      },

      // ─── Admin ─────────────────────────────────────────────
      UpdateUserStatusInput: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['active', 'suspended', 'banned'] },
          reason: { type: 'string' },
        },
      },
      UpdateFeesInput: {
        type: 'object',
        properties: {
          bookingFeePercent: { type: 'number', minimum: 0, maximum: 100 },
          platformFeePercent: { type: 'number', minimum: 0, maximum: 100 },
        },
      },

      // ─── Profile ─────────────────────────────────────────
      UpdateProfileInput: {
        type: 'object',
        properties: {
          fullName: { type: 'string' },
          phone: { type: 'string', minLength: 10 },
          avatar: { type: 'string', format: 'uri' },
        },
      },
      AddVehicleInput: {
        type: 'object',
        required: ['make', 'model', 'year', 'capacity'],
        properties: {
          make: { type: 'string' },
          model: { type: 'string' },
          year: { type: 'integer', minimum: 1900, maximum: 2100 },
          color: { type: 'string' },
          plate: { type: 'string' },
          capacity: { type: 'integer', minimum: 1, maximum: 20 },
        },
      },

      // ─── Legacy Chat ──────────────────────────────────────
      StartChatInput: {
        type: 'object',
        required: ['rideId'],
        properties: { rideId: { type: 'string', format: 'uuid' } },
      },
      ChatMessageInput: {
        type: 'object',
        required: ['content'],
        properties: { content: { type: 'string', minLength: 1, maxLength: 2000 } },
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'User authentication and account management' },
    { name: 'Profile', description: 'User profiles, vehicles, and settings' },
    { name: 'Rides', description: 'Ride creation, search, and management' },
    { name: 'Bookings', description: 'Booking and trip lifecycle' },
    { name: 'Wallet', description: 'Wallet balance, funding, withdrawals, and transfers' },
    { name: 'Payments', description: 'Payment initialization and card management' },
    { name: 'Escrow', description: 'Escrow hold/release/dispute for bookings' },
    { name: 'KYC', description: 'Identity verification and document uploads' },
    { name: 'Bills', description: 'Airtime, data, and electricity bill payments via VTPass' },
    { name: 'Chat', description: 'Legacy conversation-based chat (conversations table)' },
    { name: 'Chats', description: 'New chat system with multi-participant support' },
    { name: 'Notifications', description: 'Push notification management' },
    { name: 'Tracking', description: 'Real-time GPS tracking for active bookings' },
    { name: 'Emergency', description: 'SOS alerts and emergency contacts' },
    { name: 'Search Chatter', description: 'Ride request/offer marketplace' },
    { name: 'Route Feed', description: 'Social route status updates and comments' },
    { name: 'Ratings', description: 'User and booking rating system' },
    { name: 'Referral', description: 'Referral code and bonus system' },
    { name: 'Promo', description: 'Promotional offers and codes' },
    { name: 'PDF', description: 'PDF export of sitemaps and feature lists' },
    { name: 'Calls', description: 'Voice and video call management' },
    { name: 'Agora', description: 'Agora video call token generation' },
    { name: 'Location', description: 'Location autocomplete and geocoding' },
    { name: 'Webhooks', description: 'External service webhooks (Paystack, VTPass, Termii)' },
    { name: 'Admin', description: 'Admin-only management endpoints' },
    { name: 'VTPass Admin', description: 'Admin VTPass configuration and plan management' },
    { name: 'Health', description: 'Server health check' },
  ],
  paths: {
    // ════════════════════════════════════════════════════════════
    // AUTH
    // ════════════════════════════════════════════════════════════
    '/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Create a new user account',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SignupInput' } } } },
        responses: {
          '201': { description: 'User created', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/UserProfile' }, session: { $ref: '#/components/schemas/AuthSession' } } } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/signin': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in with email/phone and password',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SigninInput' } } } },
        responses: {
          '200': { description: 'Authenticated', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/UserProfile' }, session: { $ref: '#/components/schemas/AuthSession' } } } } } },
          '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in (alias for /auth/signin)',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SigninInput' } } } },
        responses: {
          '200': { description: 'Authenticated' },
          '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/signout': {
      post: {
        tags: ['Auth'],
        summary: 'Sign out and invalidate refresh token',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SignoutInput' } } } },
        responses: { '200': { description: 'Signed out', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshInput' } } } },
        responses: { '200': { description: 'New session', content: { 'application/json': { schema: { type: 'object', properties: { session: { $ref: '#/components/schemas/AuthSession' } } } } } } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current authenticated user',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Current user', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/UserProfile' } } } } } },
          '401': { description: 'Not authenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/verify-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Verify phone number with Firebase OTP',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyOtpInput' } } } },
        responses: { '200': { description: 'Phone verified' } },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset email',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ResetPasswordInput' } } } },
        responses: { '200': { description: 'Reset email sent' } },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change password (authenticated)',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ChangePasswordInput' } } } },
        responses: { '200': { description: 'Password changed' } },
      },
    },
    '/auth/switch-role': {
      post: {
        tags: ['Auth'],
        summary: 'Switch between rider/driver role',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SwitchRoleInput' } } } },
        responses: { '200': { description: 'Role switched', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/UserProfile' }, session: { $ref: '#/components/schemas/AuthSession' } } } } } } },
      },
    },
    '/auth/google': {
      post: {
        tags: ['Auth'],
        summary: 'Google OAuth sign-in / sign-up',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/GoogleAuthInput' } } } },
        responses: {
          '200': { description: 'Existing user signed in' },
          '201': { description: 'New user created and signed in' },
        },
      },
    },
    '/auth/2fa/status': {
      get: {
        tags: ['Auth'],
        summary: 'Get 2FA status for current user',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: '2FA status (enabled/disabled)' } },
      },
    },
    '/auth/2fa/setup': {
      post: {
        tags: ['Auth'],
        summary: 'Setup 2FA (generates secret and QR code)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: '2FA setup data (secret, QR URL)' } },
      },
    },
    '/auth/2fa/verify': {
      post: {
        tags: ['Auth'],
        summary: 'Verify and enable 2FA with OTP code',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: '2FA enabled' } },
      },
    },
    '/auth/2fa/disable': {
      post: {
        tags: ['Auth'],
        summary: 'Disable 2FA',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: '2FA disabled' } },
      },
    },
    '/auth/2fa/authenticate': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate with 2FA code during sign-in',
        responses: { '200': { description: '2FA authenticated' } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // PROFILE
    // ════════════════════════════════════════════════════════════
    '/profile/{userId}': {
      get: {
        tags: ['Profile'],
        summary: 'Get user profile',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' }, description: 'User ID or "me"' }],
        responses: { '200': { description: 'Profile data' } },
      },
      put: {
        tags: ['Profile'],
        summary: 'Update user profile',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateProfileInput' } } } },
        responses: { '200': { description: 'Updated profile' } },
      },
    },
    '/profile/{userId}/avatar': {
      post: {
        tags: ['Profile'],
        summary: 'Upload profile avatar (multipart)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } } } },
        responses: { '200': { description: 'Avatar uploaded', content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string' } } } } } } },
      },
    },
    '/profile/{userId}/rating': {
      get: {
        tags: ['Profile'],
        summary: 'Get user rating summary',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Rating data' } },
      },
    },
    '/profile/{userId}/stats': {
      get: {
        tags: ['Profile'],
        summary: 'Get user statistics (rides, bookings, etc.)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Stats data' } },
      },
    },
    '/profile/{userId}/notification-settings': {
      get: {
        tags: ['Profile'],
        summary: 'Get notification preferences',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Notification settings' } },
      },
      put: {
        tags: ['Profile'],
        summary: 'Update notification preferences',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Updated settings' } },
      },
    },
    '/profile/{userId}/vehicles': {
      get: {
        tags: ['Profile'],
        summary: 'List user vehicles',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Vehicles list' } },
      },
      post: {
        tags: ['Profile'],
        summary: 'Add a vehicle',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AddVehicleInput' } } } },
        responses: { '201': { description: 'Vehicle created' } },
      },
    },
    '/profile/{userId}/vehicles/{vehicleId}': {
      put: {
        tags: ['Profile'],
        summary: 'Update a vehicle',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Vehicle updated' } },
      },
      delete: {
        tags: ['Profile'],
        summary: 'Delete a vehicle',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Vehicle deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/profile/{userId}/vehicles/{vehicleId}/primary': {
      post: {
        tags: ['Profile'],
        summary: 'Set vehicle as primary',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Primary vehicle set', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // CHAT (legacy)
    // ════════════════════════════════════════════════════════════
    '/chat': {
      get: {
        tags: ['Chat'],
        summary: 'List conversations for current user',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Conversations list', content: { 'application/json': { schema: { type: 'object', properties: { conversations: { type: 'array', items: { type: 'object' } } } } } } } },
      },
      post: {
        tags: ['Chat'],
        summary: 'Start or get existing conversation for a ride',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/StartChatInput' } } } },
        responses: { '201': { description: 'Conversation created/found', content: { 'application/json': { schema: { type: 'object', properties: { conversationId: { type: 'string' }, existing: { type: 'boolean' } } } } } } },
      },
    },
    '/chat/{conversationId}/messages': {
      get: {
        tags: ['Chat'],
        summary: 'Get messages in a conversation',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'conversationId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: { '200': { description: 'Messages' } },
      },
      post: {
        tags: ['Chat'],
        summary: 'Send a message in a conversation',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'conversationId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ChatMessageInput' } } } },
        responses: { '201': { description: 'Message sent' } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // USER (inline)
    // ════════════════════════════════════════════════════════════
    '/user/activity': {
      get: {
        tags: ['Profile'],
        summary: 'Get user activity dashboard stats',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Activity data (totalBookings, completedBookings, averageRating, totalRides, activeDriverRides)' } },
      },
    },
    '/user/activity-feed': {
      get: {
        tags: ['Profile'],
        summary: 'Get user activity feed (bookings, transactions, notifications)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 30 } },
        ],
        responses: { '200': { description: 'Activity feed' } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // KYC
    // ════════════════════════════════════════════════════════════
    '/kyc/submit': {
      post: {
        tags: ['KYC'],
        summary: 'Submit KYC documents',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SubmitKycInput' } } } },
        responses: { '200': { description: 'KYC submitted for review' } },
      },
    },
    '/kyc/status': {
      get: {
        tags: ['KYC'],
        summary: 'Get KYC verification status',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'KYC status' } },
      },
    },
    '/kyc/verify-account': {
      post: {
        tags: ['KYC'],
        summary: 'Verify bank account number',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyAccountInput' } } } },
        responses: { '200': { description: 'Account verification result' } },
      },
    },
    '/kyc/banks': {
      get: {
        tags: ['KYC'],
        summary: 'List supported banks',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Banks list' } },
      },
    },
    '/kyc/face-verification': {
      post: {
        tags: ['KYC'],
        summary: 'Submit face verification (selfie)',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/FaceVerificationInput' } } } },
        responses: { '200': { description: 'Face verification result' } },
      },
    },
    '/kyc/verify-id': {
      post: {
        tags: ['KYC'],
        summary: 'Verify government-issued ID',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyIdInput' } } } },
        responses: { '200': { description: 'ID verification result' } },
      },
    },
    '/kyc/admin/pending': {
      get: {
        tags: ['KYC'],
        summary: 'List pending KYC submissions (admin)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Pending KYC list' } },
      },
    },
    '/kyc/admin/{id}': {
      get: {
        tags: ['KYC'],
        summary: 'Get KYC detail (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'KYC detail' } },
      },
    },
    '/kyc/admin/approve/{id}': {
      post: {
        tags: ['KYC'],
        summary: 'Approve KYC submission (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminApproveInput' } } } },
        responses: { '200': { description: 'KYC approved', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/kyc/admin/reject/{id}': {
      post: {
        tags: ['KYC'],
        summary: 'Reject KYC submission (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminRejectInput' } } } },
        responses: { '200': { description: 'KYC rejected', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // RIDES
    // ════════════════════════════════════════════════════════════
    '/rides': {
      post: {
        tags: ['Rides'],
        summary: 'Create a new ride',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateRideInput' } } } },
        responses: { '201': { description: 'Ride created', content: { 'application/json': { schema: { type: 'object', properties: { ride: { $ref: '#/components/schemas/Ride' } } } } } } },
      },
      get: {
        tags: ['Rides'],
        summary: 'List all rides (with optional filters)',
        responses: { '200': { description: 'Rides list', content: { 'application/json': { schema: { type: 'object', properties: { rides: { type: 'array', items: { $ref: '#/components/schemas/Ride' } } } } } } } },
      },
    },
    '/rides/search': {
      get: {
        tags: ['Rides'],
        summary: 'Search rides by route, date, or geospatial coordinates',
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string' }, description: 'Origin city/place name' },
          { name: 'to', in: 'query', schema: { type: 'string' }, description: 'Destination city/place name' },
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Departure date' },
          { name: 'pickupLat', in: 'query', schema: { type: 'number' }, description: 'Pickup latitude (geospatial search)' },
          { name: 'pickupLng', in: 'query', schema: { type: 'number' }, description: 'Pickup longitude (geospatial search)' },
          { name: 'pickupRadius', in: 'query', schema: { type: 'number', default: 10 }, description: 'Pickup search radius in km' },
          { name: 'dropoffLat', in: 'query', schema: { type: 'number' } },
          { name: 'dropoffLng', in: 'query', schema: { type: 'number' } },
          { name: 'dropoffRadius', in: 'query', schema: { type: 'number', default: 10 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: { '200': { description: 'Search results', content: { 'application/json': { schema: { type: 'object', properties: { rides: { type: 'array', items: { $ref: '#/components/schemas/Ride' } } } } } } } },
      },
    },
    '/rides/popular': {
      get: {
        tags: ['Rides'],
        summary: 'Get popular routes',
        responses: { '200': { description: 'Popular routes' } },
      },
    },
    '/rides/driver/{userId}': {
      get: {
        tags: ['Rides'],
        summary: 'Get rides by a specific driver',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Driver rides' } },
      },
    },
    '/rides/{rideId}': {
      get: {
        tags: ['Rides'],
        summary: 'Get ride by ID',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'rideId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Ride details', content: { 'application/json': { schema: { type: 'object', properties: { ride: { $ref: '#/components/schemas/Ride' } } } } } } },
      },
      put: {
        tags: ['Rides'],
        summary: 'Update a ride',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'rideId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateRideInput' } } } },
        responses: { '200': { description: 'Ride updated' } },
      },
      delete: {
        tags: ['Rides'],
        summary: 'Cancel a ride',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'rideId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Ride cancelled', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/rides/{rideId}/repost': {
      post: {
        tags: ['Rides'],
        summary: 'Repost a cancelled/completed ride',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'rideId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Ride reposted' } },
      },
    },
    '/rides/{rideId}/bookings': {
      get: {
        tags: ['Rides'],
        summary: 'Get all bookings for a ride',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'rideId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Bookings list' } },
      },
    },
    '/rides/{rideId}/complete': {
      post: {
        tags: ['Rides'],
        summary: 'Complete a ride (driver only, releases escrow)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'rideId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Ride completed' } },
      },
    },
    '/rides/{rideId}/cancel': {
      post: {
        tags: ['Rides'],
        summary: 'Cancel a ride with optional reason',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'rideId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CancelRideInput' } } } },
        responses: { '200': { description: 'Ride cancelled' } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // BOOKINGS
    // ════════════════════════════════════════════════════════════
    '/bookings': {
      post: {
        tags: ['Bookings'],
        summary: 'Create a new booking',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateBookingInput' } } } },
        responses: { '201': { description: 'Booking created', content: { 'application/json': { schema: { type: 'object', properties: { booking: { $ref: '#/components/schemas/Booking' } } } } } } },
      },
    },
    '/bookings/driver/pending': {
      get: {
        tags: ['Bookings'],
        summary: 'Get pending bookings for the current driver',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Pending bookings' } },
      },
    },
    '/bookings/user/{userId}': {
      get: {
        tags: ['Bookings'],
        summary: 'Get bookings for a user',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'User bookings' } },
      },
    },
    '/bookings/{bookingId}': {
      get: {
        tags: ['Bookings'],
        summary: 'Get booking details',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Booking details', content: { 'application/json': { schema: { type: 'object', properties: { booking: { $ref: '#/components/schemas/Booking' } } } } } } },
      },
    },
    '/bookings/{bookingId}/accept': {
      put: {
        tags: ['Bookings'],
        summary: 'Accept a booking (driver only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Booking accepted' } },
      },
    },
    '/bookings/{bookingId}/reject': {
      put: {
        tags: ['Bookings'],
        summary: 'Reject a booking (driver only)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Booking rejected' } },
      },
    },
    '/bookings/{bookingId}/cancel': {
      put: {
        tags: ['Bookings'],
        summary: 'Cancel a booking',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/CancelBookingInput' } } } },
        responses: { '200': { description: 'Booking cancelled', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/bookings/{bookingId}/pay': {
      post: {
        tags: ['Bookings'],
        summary: 'Pay for a booking',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PayBookingInput' } } } },
        responses: { '200': { description: 'Payment initiated' } },
      },
    },
    '/bookings/{bookingId}/complete': {
      post: {
        tags: ['Bookings'],
        summary: 'Mark booking as completed',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Booking completed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/bookings/{bookingId}/rate': {
      post: {
        tags: ['Bookings'],
        summary: 'Rate a completed booking',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RateBookingInput' } } } },
        responses: { '200': { description: 'Rating submitted', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/bookings/{bookingId}/confirm-paystack': {
      post: {
        tags: ['Bookings'],
        summary: 'Confirm booking after Paystack payment',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Booking confirmed' } },
      },
    },
    '/bookings/{bookingId}/receipt': {
      get: {
        tags: ['Bookings'],
        summary: 'Get booking receipt',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Receipt data' } },
      },
    },
    '/bookings/{bookingId}/confirm-pickup': {
      post: {
        tags: ['Bookings'],
        summary: 'Confirm passenger pickup',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Pickup confirmed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/bookings/{bookingId}/confirm-dropoff': {
      post: {
        tags: ['Bookings'],
        summary: 'Confirm passenger dropoff',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Dropoff confirmed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // WALLET
    // ════════════════════════════════════════════════════════════
    '/wallet/banks': {
      get: {
        tags: ['Wallet'],
        summary: 'List supported banks for withdrawals',
        responses: { '200': { description: 'Banks list' } },
      },
    },
    '/wallet/bank-account': {
      get: {
        tags: ['Wallet'],
        summary: 'Get saved bank account for current user',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Bank account details' } },
      },
    },
    '/wallet/resolve-account': {
      post: {
        tags: ['Wallet'],
        summary: 'Resolve bank account name',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ResolveAccountInput' } } } },
        responses: { '200': { description: 'Account resolved' } },
      },
    },
    '/wallet/fund': {
      post: {
        tags: ['Wallet'],
        summary: 'Fund wallet via Paystack',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/FundWalletInput' } } } },
        responses: { '200': { description: 'Payment URL generated' } },
      },
    },
    '/wallet/verify-payment': {
      post: {
        tags: ['Wallet'],
        summary: 'Verify wallet funding payment',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyPaymentInput' } } } },
        responses: { '200': { description: 'Payment verified' } },
      },
    },
    '/wallet/withdraw': {
      post: {
        tags: ['Wallet'],
        summary: 'Withdraw funds to bank account',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/WithdrawInput' } } } },
        responses: { '200': { description: 'Withdrawal initiated' } },
      },
    },
    '/wallet/transfer': {
      post: {
        tags: ['Wallet'],
        summary: 'Transfer funds to another user',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TransferInput' } } } },
        responses: { '200': { description: 'Transfer completed' } },
      },
    },
    '/wallet/me': {
      get: {
        tags: ['Wallet'],
        summary: 'Get current user wallet',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Wallet data', content: { 'application/json': { schema: { type: 'object', properties: { wallet: { $ref: '#/components/schemas/Wallet' } } } } } } },
      },
    },
    '/wallet/{userId}': {
      get: {
        tags: ['Wallet'],
        summary: 'Get wallet details',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Wallet data', content: { 'application/json': { schema: { type: 'object', properties: { wallet: { $ref: '#/components/schemas/Wallet' } } } } } } },
      },
    },
    '/wallet/{userId}/transactions': {
      get: {
        tags: ['Wallet'],
        summary: 'Get wallet transaction history',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Transactions list' } },
      },
    },
    '/wallet/{userId}/statistics': {
      get: {
        tags: ['Wallet'],
        summary: 'Get wallet statistics',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Statistics' } },
      },
    },
    '/wallet/{userId}/freeze': {
      post: {
        tags: ['Wallet'],
        summary: 'Freeze wallet',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/FreezeWalletInput' } } } },
        responses: { '200': { description: 'Wallet frozen', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/wallet/{userId}/unfreeze': {
      post: {
        tags: ['Wallet'],
        summary: 'Unfreeze wallet',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Wallet unfrozen', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // ESCROW
    // ════════════════════════════════════════════════════════════
    '/escrow/hold': {
      post: {
        tags: ['Escrow'],
        summary: 'Hold funds in escrow for a booking',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/HoldEscrowInput' } } } },
        responses: { '200': { description: 'Escrow created' } },
      },
    },
    '/escrow/booking/{bookingId}': {
      get: {
        tags: ['Escrow'],
        summary: 'Get escrow by booking ID',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Escrow details' } },
      },
    },
    '/escrow/user/{userId}': {
      get: {
        tags: ['Escrow'],
        summary: 'Get user escrow records',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Escrows list' } },
      },
    },
    '/escrow/admin/pending-disputes': {
      get: {
        tags: ['Escrow'],
        summary: 'List pending disputes (admin)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Disputes list' } },
      },
    },
    '/escrow/{escrowId}/status': {
      get: {
        tags: ['Escrow'],
        summary: 'Get escrow status',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'escrowId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Escrow status' } },
      },
    },
    '/escrow/{escrowId}/release': {
      post: {
        tags: ['Escrow'],
        summary: 'Release funds to driver',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'escrowId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ReleaseEscrowInput' } } } },
        responses: { '200': { description: 'Funds released', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/escrow/{escrowId}/refund': {
      post: {
        tags: ['Escrow'],
        summary: 'Refund funds to rider',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'escrowId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/RefundEscrowInput' } } } },
        responses: { '200': { description: 'Funds refunded', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/escrow/{escrowId}/dispute': {
      post: {
        tags: ['Escrow'],
        summary: 'Raise a dispute on an escrow',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'escrowId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/DisputeEscrowInput' } } } },
        responses: { '200': { description: 'Dispute raised', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/escrow/{escrowId}/resolve': {
      post: {
        tags: ['Escrow'],
        summary: 'Resolve an escrow dispute (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'escrowId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ResolveEscrowInput' } } } },
        responses: { '200': { description: 'Dispute resolved', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // PAYMENTS
    // ════════════════════════════════════════════════════════════
    '/payments/initialize': {
      post: {
        tags: ['Payments'],
        summary: 'Initialize Paystack payment',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/InitPaymentInput' } } } },
        responses: { '200': { description: 'Payment URL generated' } },
      },
    },
    '/payments/verify/{reference}': {
      get: {
        tags: ['Payments'],
        summary: 'Verify payment by reference',
        parameters: [{ name: 'reference', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Payment verification result' } },
      },
    },
    '/payments/charge-card': {
      post: {
        tags: ['Payments'],
        summary: 'Charge a saved card',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ChargeCardInput' } } } },
        responses: { '200': { description: 'Card charged' } },
      },
    },
    '/payments/methods/card': {
      post: {
        tags: ['Payments'],
        summary: 'Save a card for future payments',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SaveCardInput' } } } },
        responses: { '200': { description: 'Card saved' } },
      },
    },
    '/payments/methods/{userId}': {
      get: {
        tags: ['Payments'],
        summary: 'Get saved payment methods',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Saved methods' } },
      },
    },
    '/payments/methods/{methodId}': {
      delete: {
        tags: ['Payments'],
        summary: 'Delete a saved payment method',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'methodId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Method deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // WEBHOOKS
    // ════════════════════════════════════════════════════════════
    '/webhooks/paystack': {
      post: {
        tags: ['Webhooks'],
        summary: 'Paystack webhook (charge.success)',
        description: 'Verifies HMAC signature, processes escrow release, booking confirmation, wallet funding, and notifications.',
        responses: { '200': { description: 'Webhook processed' } },
      },
    },
    '/webhooks/vtpass': {
      post: {
        tags: ['Webhooks'],
        summary: 'VTPass webhook for bill payment status',
        responses: { '200': { description: 'Webhook processed' } },
      },
    },
    '/webhooks/termii': {
      post: {
        tags: ['Webhooks'],
        summary: 'Termii SMS webhook for delivery reports',
        responses: { '200': { description: 'Webhook processed' } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // CHATS (new)
    // ════════════════════════════════════════════════════════════
    '/chats': {
      post: {
        tags: ['Chats'],
        summary: 'Create a new chat group',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateChatInput' } } } },
        responses: { '201': { description: 'Chat created' } },
      },
    },
    '/chats/unread/{userId}': {
      get: {
        tags: ['Chats'],
        summary: 'Get unread message counts for a user',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Unread counts' } },
      },
    },
    '/chats/{userId}': {
      get: {
        tags: ['Chats'],
        summary: 'Get user chat list',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Chat list', content: { 'application/json': { schema: { type: 'object', properties: { chats: { type: 'array', items: { type: 'object' } } } } } } } },
      },
    },
    '/chats/{chatId}/messages': {
      get: {
        tags: ['Chats'],
        summary: 'Get messages in a chat',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'chatId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'before', in: 'query', schema: { type: 'string', format: 'date-time' }, description: 'Cursor for pagination' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 50 } },
        ],
        responses: { '200': { description: 'Messages with hasMore flag' } },
      },
      post: {
        tags: ['Chats'],
        summary: 'Send a message in a chat',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'chatId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SendMessageInput' } } } },
        responses: { '201': { description: 'Message sent' } },
      },
    },
    '/chats/{chatId}/read': {
      put: {
        tags: ['Chats'],
        summary: 'Mark all messages as read in a chat',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'chatId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Marked as read', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/chats/{chatId}/typing': {
      post: {
        tags: ['Chats'],
        summary: 'Send typing indicator',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'chatId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TypingInput' } } } },
        responses: { '200': { description: 'Typing indicator sent', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/chats/{chatId}': {
      delete: {
        tags: ['Chats'],
        summary: 'Delete a chat',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'chatId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Chat deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ════════════════════════════════════════════════════════════
    '/notifications/send': {
      post: {
        tags: ['Notifications'],
        summary: 'Send a notification (admin/system)',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SendNotificationInput' } } } },
        responses: { '200': { description: 'Notification sent' } },
      },
    },
    '/notifications/register-token': {
      post: {
        tags: ['Notifications'],
        summary: 'Register push notification token',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterTokenInput' } } } },
        responses: { '200': { description: 'Token registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/notifications/unregister-token': {
      delete: {
        tags: ['Notifications'],
        summary: 'Unregister push notification token',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UnregisterTokenInput' } } } },
        responses: { '200': { description: 'Token unregistered', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/notifications/me': {
      get: {
        tags: ['Notifications'],
        summary: 'Get current user notifications',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Notifications list' } },
      },
    },
    '/notifications/read-all': {
      put: {
        tags: ['Notifications'],
        summary: 'Mark all notifications as read for current user',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'All marked read', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/notifications/{userId}': {
      get: {
        tags: ['Notifications'],
        summary: 'Get user notifications',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Notifications list' } },
      },
    },
    '/notifications/{userId}/read-all': {
      put: {
        tags: ['Notifications'],
        summary: 'Mark all notifications as read for a user',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'All marked read', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/notifications/{notificationId}/read': {
      put: {
        tags: ['Notifications'],
        summary: 'Mark a single notification as read',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'notificationId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Marked read', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/notifications/{notificationId}': {
      delete: {
        tags: ['Notifications'],
        summary: 'Delete a notification',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'notificationId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Notification deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // TRACKING
    // ════════════════════════════════════════════════════════════
    '/tracking/{bookingId}/start': {
      post: {
        tags: ['Tracking'],
        summary: 'Start tracking a booking',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TrackingStartInput' } } } },
        responses: { '200': { description: 'Tracking started' } },
      },
    },
    '/tracking/{bookingId}/live': {
      get: {
        tags: ['Tracking'],
        summary: 'Get driver live location',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Live location' } },
      },
    },
    '/tracking/{bookingId}/history': {
      get: {
        tags: ['Tracking'],
        summary: 'Get location history for a booking',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Location history' } },
      },
    },
    '/tracking/{bookingId}/end': {
      post: {
        tags: ['Tracking'],
        summary: 'End tracking for a booking',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Tracking ended' } },
      },
    },
    '/tracking/{trackingId}/update': {
      post: {
        tags: ['Tracking'],
        summary: 'Update driver location',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'trackingId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LocationUpdateInput' } } } },
        responses: { '200': { description: 'Location updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/tracking/deviation': {
      post: {
        tags: ['Tracking'],
        summary: 'Report route deviation',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/DeviationInput' } } } },
        responses: { '200': { description: 'Deviation reported' } },
      },
    },
    '/tracking/eta': {
      get: {
        tags: ['Tracking'],
        summary: 'Calculate ETA between two points',
        parameters: [
          { name: 'origin', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'destination', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'ETA calculated' } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // EMERGENCY
    // ════════════════════════════════════════════════════════════
    '/emergency/sos': {
      post: {
        tags: ['Emergency'],
        summary: 'Trigger SOS alert',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SosInput' } } } },
        responses: { '200': { description: 'SOS triggered, contacts notified' } },
      },
    },
    '/emergency/contacts/{userId}': {
      get: {
        tags: ['Emergency'],
        summary: 'Get emergency contacts for a user',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Contacts list' } },
      },
    },
    '/emergency/contacts': {
      post: {
        tags: ['Emergency'],
        summary: 'Add an emergency contact',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/AddContactInput' } } } },
        responses: { '201': { description: 'Contact added' } },
      },
    },
    '/emergency/contacts/{contactId}': {
      put: {
        tags: ['Emergency'],
        summary: 'Update an emergency contact',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'contactId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateContactInput' } } } },
        responses: { '200': { description: 'Contact updated' } },
      },
      delete: {
        tags: ['Emergency'],
        summary: 'Delete an emergency contact',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'contactId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Contact deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/emergency/{alertId}/cancel': {
      post: {
        tags: ['Emergency'],
        summary: 'Cancel an SOS alert',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'alertId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Alert cancelled', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/emergency/{alertId}/status': {
      get: {
        tags: ['Emergency'],
        summary: 'Get SOS alert status',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'alertId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Alert status' } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // SEARCH CHATTER
    // ════════════════════════════════════════════════════════════
    '/search-chatter/requests': {
      post: {
        tags: ['Search Chatter'],
        summary: 'Create a ride request',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RequestInput' } } } },
        responses: { '201': { description: 'Request created' } },
      },
      get: {
        tags: ['Search Chatter'],
        summary: 'Get active ride requests',
        parameters: [
          { name: 'origin', in: 'query', schema: { type: 'string' } },
          { name: 'dest', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Active requests' } },
      },
    },
    '/search-chatter/requests/{requestId}/offers': {
      post: {
        tags: ['Search Chatter'],
        summary: 'Make an offer on a request',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'requestId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OfferInput' } } } },
        responses: { '201': { description: 'Offer created' } },
      },
      get: {
        tags: ['Search Chatter'],
        summary: 'Get offers for a request',
        parameters: [{ name: 'requestId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Offers list' } },
      },
    },
    '/search-chatter/offers/{offerId}/accept': {
      put: {
        tags: ['Search Chatter'],
        summary: 'Accept an offer (creates booking)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'offerId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Offer accepted, booking created' } },
      },
    },
    '/search-chatter/offers/{offerId}/reject': {
      put: {
        tags: ['Search Chatter'],
        summary: 'Reject an offer',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'offerId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Offer rejected', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/search-chatter/requests/{requestId}': {
      delete: {
        tags: ['Search Chatter'],
        summary: 'Delete a ride request',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'requestId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Request deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // ROUTE FEED
    // ════════════════════════════════════════════════════════════
    '/route-feed': {
      post: {
        tags: ['Route Feed'],
        summary: 'Create a route status update',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/StatusInput' } } } },
        responses: { '201': { description: 'Status created' } },
      },
      get: {
        tags: ['Route Feed'],
        summary: 'Get route feed (public)',
        parameters: [
          { name: 'route', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        ],
        responses: { '200': { description: 'Feed list' } },
      },
    },
    '/route-feed/route/{routeId}': {
      get: {
        tags: ['Route Feed'],
        summary: 'Get all statuses for a specific route',
        parameters: [{ name: 'routeId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Route statuses' } },
      },
    },
    '/route-feed/{statusId}': {
      get: {
        tags: ['Route Feed'],
        summary: 'Get a single status with comments',
        parameters: [{ name: 'statusId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Status details' } },
      },
      post: {
        tags: ['Route Feed'],
        summary: 'Add a comment to a status',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'statusId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CommentInput' } } } },
        responses: { '201': { description: 'Comment added' } },
      },
      delete: {
        tags: ['Route Feed'],
        summary: 'Delete a status',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'statusId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Status deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/route-feed/{statusId}/comment': {
      post: {
        tags: ['Route Feed'],
        summary: 'Add a comment to a status',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'statusId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CommentInput' } } } },
        responses: { '201': { description: 'Comment added' } },
      },
    },
    '/route-feed/{statusId}/react': {
      post: {
        tags: ['Route Feed'],
        summary: 'React to a status',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'statusId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ReactInput' } } } },
        responses: { '200': { description: 'Reaction updated' } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // BILLS
    // ════════════════════════════════════════════════════════════
    '/bills/services': {
      get: {
        tags: ['Bills'],
        summary: 'List available bill payment services',
        responses: { '200': { description: 'Services list' } },
      },
    },
    '/bills/providers': {
      get: {
        tags: ['Bills'],
        summary: 'List service providers',
        responses: { '200': { description: 'Providers list' } },
      },
    },
    '/bills/data-plans': {
      get: {
        tags: ['Bills'],
        summary: 'Get available data plans',
        responses: { '200': { description: 'Data plans' } },
      },
    },
    '/bills/saved-plans/tv': {
      get: {
        tags: ['Bills'],
        summary: 'Get saved TV subscription plans',
        responses: { '200': { description: 'Saved TV plans' } },
      },
    },
    '/bills/saved-plans/data': {
      get: {
        tags: ['Bills'],
        summary: 'Get saved data plans',
        responses: { '200': { description: 'Saved data plans' } },
      },
    },
    '/bills/history/{userId}': {
      get: {
        tags: ['Bills'],
        summary: 'Get bill payment history',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'History' } },
      },
    },
    '/bills/airtime': {
      post: {
        tags: ['Bills'],
        summary: 'Buy airtime',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BuyAirtimeInput' } } } },
        responses: { '200': { description: 'Airtime purchased' } },
      },
    },
    '/bills/data': {
      post: {
        tags: ['Bills'],
        summary: 'Buy data plan',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BuyDataInput' } } } },
        responses: { '200': { description: 'Data purchased' } },
      },
    },
    '/bills/electricity': {
      post: {
        tags: ['Bills'],
        summary: 'Pay electricity bill',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PayElectricityInput' } } } },
        responses: { '200': { description: 'Bill paid' } },
      },
    },
    '/bills/verify-meter': {
      post: {
        tags: ['Bills'],
        summary: 'Verify prepaid meter number',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyMeterInput' } } } },
        responses: { '200': { description: 'Meter verification result' } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // RATINGS
    // ════════════════════════════════════════════════════════════
    '/ratings': {
      post: {
        tags: ['Ratings'],
        summary: 'Create a rating',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateRatingInput' } } } },
        responses: { '201': { description: 'Rating created' } },
      },
    },
    '/ratings/user/{userId}': {
      get: {
        tags: ['Ratings'],
        summary: 'Get ratings for a user',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['driver', 'rider'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        ],
        responses: { '200': { description: 'Ratings list with average' } },
      },
    },
    '/ratings/user/{userId}/summary': {
      get: {
        tags: ['Ratings'],
        summary: 'Get rating summary (average, distribution)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Rating summary' } },
      },
    },
    '/ratings/booking/{bookingId}': {
      get: {
        tags: ['Ratings'],
        summary: 'Get ratings for a booking',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Booking ratings' } },
      },
    },
    '/ratings/{ratingId}': {
      put: {
        tags: ['Ratings'],
        summary: 'Update a rating',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'ratingId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateRatingInput' } } } },
        responses: { '200': { description: 'Rating updated' } },
      },
      delete: {
        tags: ['Ratings'],
        summary: 'Delete a rating',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'ratingId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Rating deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // REFERRAL
    // ════════════════════════════════════════════════════════════
    '/referral': {
      get: {
        tags: ['Referral'],
        summary: 'Get referral code, stats, and referred users',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Referral data' } },
      },
    },
    '/referral/apply': {
      post: {
        tags: ['Referral'],
        summary: 'Apply a referral code (get welcome bonus)',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ApplyCodeInput' } } } },
        responses: { '200': { description: 'Referral applied' } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // PROMO
    // ════════════════════════════════════════════════════════════
    '/promo': {
      get: {
        tags: ['Promo'],
        summary: 'Get available promotional offers',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Promo offers' } },
      },
    },
    '/promo/apply': {
      post: {
        tags: ['Promo'],
        summary: 'Apply a promo code',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ApplyCodeInput' } } } },
        responses: { '200': { description: 'Promo applied' } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // PDF
    // ════════════════════════════════════════════════════════════
    '/pdf/export/{type}': {
      get: {
        tags: ['PDF'],
        summary: 'Export a PDF (sitemap or features)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'type', in: 'path', required: true, schema: { type: 'string', enum: ['sitemap', 'features'] } }],
        responses: {
          '200': { description: 'PDF file', content: { 'application/pdf': {} } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ════════════════════════════════════════════════════════════
    // AGORA
    // ════════════════════════════════════════════════════════════
    '/agora/token': {
      get: {
        tags: ['Agora'],
        summary: 'Generate Agora video call token',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'channel', in: 'query', schema: { type: 'string', default: 'default' } },
          { name: 'uid', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['publisher', 'subscriber'], default: 'publisher' } },
          { name: 'expire', in: 'query', schema: { type: 'integer', default: 3600 }, description: 'Token TTL in seconds' },
        ],
        responses: { '200': { description: 'Token generated', content: { 'application/json': { schema: { type: 'object', properties: { token: { type: 'string' }, appId: { type: 'string' }, channel: { type: 'string' }, uid: { type: 'integer' }, role: { type: 'string' }, expireAt: { type: 'integer' } } } } } } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // CALLS
    // ════════════════════════════════════════════════════════════
    '/calls/initiate': {
      post: {
        tags: ['Calls'],
        summary: 'Initiate a voice/video call',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Call initiated' } },
      },
    },
    '/calls/incoming': {
      get: {
        tags: ['Calls'],
        summary: 'Get incoming calls',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Incoming calls list' } },
      },
    },
    '/calls/history': {
      get: {
        tags: ['Calls'],
        summary: 'Get call history',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Call history' } },
      },
    },
    '/calls/{id}/accept': {
      put: {
        tags: ['Calls'],
        summary: 'Accept an incoming call',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Call accepted' } },
      },
    },
    '/calls/{id}/reject': {
      put: {
        tags: ['Calls'],
        summary: 'Reject an incoming call',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Call rejected' } },
      },
    },
    '/calls/{id}/end': {
      put: {
        tags: ['Calls'],
        summary: 'End an active call',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Call ended' } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // LOCATION
    // ════════════════════════════════════════════════════════════
    '/location/route': {
      get: {
        tags: ['Location'],
        summary: 'Get driving route geometry between two points',
        parameters: [
          { name: 'fromLng', in: 'query', schema: { type: 'number' }, description: 'Origin longitude' },
          { name: 'fromLat', in: 'query', schema: { type: 'number' }, description: 'Origin latitude' },
          { name: 'toLng', in: 'query', schema: { type: 'number' }, description: 'Destination longitude' },
          { name: 'toLat', in: 'query', schema: { type: 'number' }, description: 'Destination latitude' },
        ],
        responses: { '200': { description: 'Route geometry' } },
      },
    },
    '/location/autocomplete': {
      get: {
        tags: ['Location'],
        summary: 'Autocomplete location search',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'Search query' },
        ],
        responses: { '200': { description: 'Location suggestions' } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // ADMIN
    // ════════════════════════════════════════════════════════════
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List all users (admin)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Users list' } },
      },
    },
    '/admin/users/{userId}': {
      get: {
        tags: ['Admin'],
        summary: 'Get user details (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'User details' } },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete a user (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'User deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/admin/users/{userId}/status': {
      put: {
        tags: ['Admin'],
        summary: 'Update user status (active/suspended/banned)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateUserStatusInput' } } } },
        responses: { '200': { description: 'Status updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/admin/rides': {
      get: {
        tags: ['Admin'],
        summary: 'List all rides (admin)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Rides list' } },
      },
    },
    '/admin/rides/{rideId}': {
      put: {
        tags: ['Admin'],
        summary: 'Admin update a ride',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'rideId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Ride updated' } },
      },
    },
    '/admin/bookings': {
      get: {
        tags: ['Admin'],
        summary: 'List all bookings (admin)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Bookings list' } },
      },
    },
    '/admin/bookings/{bookingId}': {
      get: {
        tags: ['Admin'],
        summary: 'Get booking details (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Booking details' } },
      },
    },
    '/admin/bookings/{bookingId}/complete': {
      post: {
        tags: ['Admin'],
        summary: 'Admin complete a booking',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Booking completed' } },
      },
    },
    '/admin/transactions': {
      get: {
        tags: ['Admin'],
        summary: 'List all transactions (admin)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Transactions list' } },
      },
    },
    '/admin/escrow': {
      get: {
        tags: ['Admin'],
        summary: 'List escrow issues (admin)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Escrow issues' } },
      },
    },
    '/admin/escrow/{escrowId}/release': {
      post: {
        tags: ['Admin'],
        summary: 'Admin release escrow',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'escrowId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Escrow released' } },
      },
    },
    '/admin/kyc/pending': {
      get: {
        tags: ['Admin'],
        summary: 'List pending KYC submissions (admin)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Pending KYC' } },
      },
    },
    '/admin/statistics': {
      get: {
        tags: ['Admin'],
        summary: 'Get platform statistics (admin)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Statistics' } },
      },
    },
    '/admin/fees/update': {
      post: {
        tags: ['Admin'],
        summary: 'Update platform fees (admin)',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateFeesInput' } } } },
        responses: { '200': { description: 'Fees updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } } },
      },
    },
    '/admin/wallets/fund-all': {
      post: {
        tags: ['Admin'],
        summary: 'Fund all rider wallets (admin)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'All wallets funded' } },
      },
    },
    '/admin/completions/pending': {
      get: {
        tags: ['Admin'],
        summary: 'List pending completion approvals (admin)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Pending completions' } },
      },
    },
    '/admin/completions/{bookingId}/approve': {
      post: {
        tags: ['Admin'],
        summary: 'Approve a completion request (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Completion approved' } },
      },
    },
    '/admin/completions/{bookingId}/deny': {
      post: {
        tags: ['Admin'],
        summary: 'Deny a completion request (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'bookingId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Completion denied' } },
      },
    },
    '/admin/wallets': {
      get: {
        tags: ['Admin'],
        summary: 'List all wallets (admin)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Wallets list' } },
      },
    },
    '/admin/wallets/{userId}/transactions': {
      get: {
        tags: ['Admin'],
        summary: 'List wallet transactions for a user (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Transactions list' } },
      },
    },
    '/admin/wallets/{userId}/credit': {
      post: {
        tags: ['Admin'],
        summary: 'Credit a user wallet (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Wallet credited' } },
      },
    },
    '/admin/wallets/{userId}/debit': {
      post: {
        tags: ['Admin'],
        summary: 'Debit a user wallet (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Wallet debited' } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // VTPASS ADMIN
    // ════════════════════════════════════════════════════════════
    '/admin/vtpass/plans': {
      get: {
        tags: ['VTPass Admin'],
        summary: 'Get VTPass service plans (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'service', in: 'query', required: true, schema: { type: 'string' }, description: 'Service ID (e.g. mtn-data, dstv)' },
          { name: 'apiType', in: 'query', schema: { type: 'string', default: 'vtpass' }, description: 'API type: vtpass or bardetech' },
          { name: 'savedOnly', in: 'query', schema: { type: 'boolean', default: false } },
        ],
        responses: { '200': { description: 'Plans list' } },
      },
      post: {
        tags: ['VTPass Admin'],
        summary: 'Create or upsert a plan (admin)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Plan created/updated' } },
      },
      delete: {
        tags: ['VTPass Admin'],
        summary: 'Delete plans by apiType (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'apiType', in: 'query', schema: { type: 'string' }, description: 'API type to delete' },
        ],
        responses: { '200': { description: 'Plans deleted' } },
      },
    },
    '/admin/vtpass/plan/{id}': {
      patch: {
        tags: ['VTPass Admin'],
        summary: 'Update a saved plan (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Plan updated' } },
      },
    },
    '/admin/vtpass/plans/bulk': {
      patch: {
        tags: ['VTPass Admin'],
        summary: 'Bulk update plans (admin)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Plans updated' } },
      },
    },
    '/admin/vtpass/plans/bardetech': {
      delete: {
        tags: ['VTPass Admin'],
        summary: 'Delete all Bardetech plans (admin)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Bardetech plans removed' } },
      },
    },
    '/admin/vtpass/plans/{id}': {
      delete: {
        tags: ['VTPass Admin'],
        summary: 'Delete a single saved plan by ID (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Plan deleted' } },
      },
    },
    '/admin/vtpass/electricity/mode': {
      get: {
        tags: ['VTPass Admin'],
        summary: 'Get electricity mode (sandbox/live)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Current mode' } },
      },
      post: {
        tags: ['VTPass Admin'],
        summary: 'Set electricity mode (sandbox/live)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Mode updated' } },
      },
    },
    '/admin/vtpass/env': {
      get: {
        tags: ['VTPass Admin'],
        summary: 'Get VTPass environment (sandbox/live)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Current environment' } },
      },
      post: {
        tags: ['VTPass Admin'],
        summary: 'Set VTPass environment (sandbox/live)',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Environment updated' } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // CONFIG
    // ════════════════════════════════════════════════════════════
    '/config': {
      get: {
        tags: ['Health'],
        summary: 'Get public app configuration (Mapbox token, etc.)',
        responses: { '200': { description: 'Config key-value pairs' } },
      },
    },

    // ════════════════════════════════════════════════════════════
    // HEALTH
    // ════════════════════════════════════════════════════════════
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check (DB connectivity)',
        responses: {
          '200': { description: 'Healthy', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, database: { type: 'string' } } } } } },
          '503': { description: 'Degraded', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, error: { type: 'string' }, hint: { type: 'string' } } } } } },
        },
      },
    },
  },
};

export default spec;
