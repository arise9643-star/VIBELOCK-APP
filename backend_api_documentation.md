# Grinder Backend API Documentation

This document outlines the HTTP API endpoints and WebSocket events provided by the Grinder backend, based on the analysis of the `grinder-backend` directory.

## HTTP API Endpoints

All HTTP API endpoints are prefixed with `/api`.

### 1. Authentication (`/api/auth`)

*   **`POST /api/auth/signup`**
    *   **Description:** Registers a new user.
    *   **Authentication:** Public (No authentication required).
    *   **Request Body (Example):**
        ```json
        {
          "username": "newuser",
          "email": "newuser@example.com",
          "password": "strongpassword"
        }
        ```
    *   **Response (Success 201 Created):**
        ```json
        {
          "message": "User registered successfully",
          "token": "jwt_token_string"
        }
        ```

*   **`POST /api/auth/login`**
    *   **Description:** Authenticates a user and provides a JWT token.
    *   **Authentication:** Public.
    *   **Request Body (Example):**
        ```json
        {
          "email": "user@example.com",
          "password": "mypassword"
        }
        ```
    *   **Response (Success 200 OK):**
        ```json
        {
          "message": "Logged in successfully",
          "token": "jwt_token_string",
          "user": {
            "id": "user_id",
            "username": "username"
          }
        }
        ```

*   **`GET /api/auth/me`**
    *   **Description:** Retrieves the profile of the currently authenticated user.
    *   **Authentication:** Required (JWT in `Authorization` header).
    *   **Response (Success 200 OK):**
        ```json
        {
          "id": "user_id",
          "username": "username",
          "email": "user@example.com"
        }
        ```

### 2. Room Management (`/api/rooms`)

*   **`POST /api/rooms/create`**
    *   **Description:** Creates a new focus room.
    *   **Authentication:** Required.
    *   **Request Body (Example):** (Details to be confirmed by `roomController.createRoom`)
        ```json
        {
          "roomName": "My Study Session",
          "isPrivate": true
        }
        ```
    *   **Response (Success 201 Created):**
        ```json
        {
          "roomCode": "ABCD123",
          "message": "Room created successfully"
        }
        ```

*   **`POST /api/rooms/join`**
    *   **Description:** Allows a user to join an existing room.
    *   **Authentication:** Required.
    *   **Request Body (Example):**
        ```json
        {
          "roomCode": "ABCD123"
        }
        ```
    *   **Response (Success 200 OK):**
        ```json
        {
          "message": "Joined room successfully",
          "roomCode": "ABCD123"
        }
        ```

*   **`GET /api/rooms/:code`**
    *   **Description:** Retrieves details for a specific room using its code.
    *   **Authentication:** Required.
    *   **Path Parameters:** `:code` - The unique code of the room.
    *   **Response (Success 200 OK):** (Details to be confirmed by `roomController.getRoom`)
        ```json
        {
          "roomCode": "ABCD123",
          "roomName": "My Study Session",
          "ownerId": "owner_user_id",
          "participants": ["user1_id", "user2_id"]
        }
        ```

### 3. Session Management (`/api/sessions`)

*   **`POST /api/sessions/start`**
    *   **Description:** Initiates a new focus session for the authenticated user within a room.
    *   **Authentication:** Required.
    *   **Request Body (Example):** (Details to be confirmed by `sessionController.startSession`)
        ```json
        {
          "roomCode": "ABCD123",
          "durationMinutes": 60
        }
        ```
    *   **Response (Success 201 Created):**
        ```json
        {
          "sessionId": "session_id",
          "message": "Session started"
        }
        ```

*   **`POST /api/sessions/end`**
    *   **Description:** Concludes an active focus session.
    *   **Authentication:** Required.
    *   **Request Body (Example):**
        ```json
        {
          "sessionId": "session_id"
        }
        ```
    *   **Response (Success 200 OK):**
        ```json
        {
          "message": "Session ended"
        }
        ```

*   **`GET /api/sessions/history`**
    *   **Description:** Retrieves a list of past focus sessions for the authenticated user.
    *   **Authentication:** Required.
    *   **Query Parameters (Example):** `?limit=10&offset=0`
    *   **Response (Success 200 OK):** (Details to be confirmed by `sessionController.getHistory`)
        ```json
        [
          {
            "sessionId": "session_id_1",
            "roomCode": "ABCD123",
            "startTime": "ISO_DATE_STRING",
            "endTime": "ISO_DATE_STRING",
            "duration": 60, // minutes
            "focusScore": 85
          },
          {
            "sessionId": "session_id_2",
            "roomCode": "XYZ789",
            "startTime": "ISO_DATE_STRING",
            "endTime": "ISO_DATE_STRING",
            "duration": 30,
            "focusScore": 70
          }
        ]
        ```

### 4. User Statistics (`/api/stats`)

*   **`GET /api/stats/user`**
    *   **Description:** Fetches statistics for the authenticated user (e.g., total focus time, average score).
    *   **Authentication:** Required.
    *   **Response (Success 200 OK):** (Details to be confirmed by `statsController.getUserStats`)
        ```json
        {
          "totalFocusTime": 1200, // minutes
          "averageFocusScore": 78,
          "sessionsCompleted": 25,
          "bestFocusScore": 92
        }
        ```

*   **`GET /api/stats/leaderboard`**
    *   **Description:** Retrieves a global leaderboard of users based on focus metrics.
    *   **Authentication:** Public.
    *   **Query Parameters (Example):** `?sortBy=focusScore&limit=10`
    *   **Response (Success 200 OK):** (Details to be confirmed by `statsController.getLeaderboard`)
        ```json
        [
          {
            "userId": "user_id_1",
            "username": "TopGrinder",
            "totalFocusTime": 5000,
            "averageFocusScore": 95
          },
          {
            "userId": "user_id_2",
            "username": "FocusMaster",
            "totalFocusTime": 4500,
            "averageFocusScore": 90
          }
        ]
        ```

---

## WebSocket Events

The backend uses Socket.io for real-time communication. All events are handled through the `initializeSocket` function.

### 1. Client-to-Server Events (Frontend Emits)

*   **`join-room`**
    *   **Description:** Sent by a client to join a specific room.
    *   **Payload:**
        ```json
        {
          "roomCode": "string",  // The code of the room to join
          "userId": "string",    // The ID of the joining user
          "userName": "string"   // The username of the joining user
        }
        ```

*   **`timer-start`**
    *   **Description:** Sent by a client (e.g., room owner) to start the room's timer.
    *   **Payload:**
        ```json
        {
          "roomCode": "string",   // The code of the room
          "duration": "number"    // Duration of the timer in milliseconds
        }
        ```

*   **`timer-pause`**
    *   **Description:** Sent by a client to pause the room's timer.
    *   **Payload:**
        ```json
        {
          "roomCode": "string"    // The code of the room
        }
        ```

*   **`timer-resume`**
    *   **Description:** Sent by a client to resume the room's paused timer.
    *   **Payload:**
        ```json
        {
          "roomCode": "string"    // The code of the room
        }
        ```

*   **`timer-reset`**
    *   **Description:** Sent by a client to reset the room's timer.
    *   **Payload:**
        ```json
        {
          "roomCode": "string"    // The code of the room
        }
        ```

*   **`timer-update`**
    *   **Description:** Sent by a client to update the server with the current time remaining. (Used for synchronization)
    *   **Payload:**
        ```json
        {
          "roomCode": "string",           // The code of the room
          "timeRemaining": "number"       // Current time remaining in milliseconds
        }
        ```

*   **`chat-message`**
    *   **Description:** Sent by a client to send a chat message to all participants in a room.
    *   **Payload:**
        ```json
        {
          "roomCode": "string",   // The code of the room
          "userId": "string",     // The ID of the message sender
          "userName": "string",   // The username of the message sender
          "message": "string"     // The chat message content
        }
        ```

*   **`leave-room`**
    *   **Description:** Sent by a client to leave a room.
    *   **Payload:**
        ```json
        {
          "roomCode": "string",   // The code of the room
          "userId": "string",     // The ID of the user leaving
          "userName": "string"    // The username of the user leaving
        }
        ```

### 2. Server-to-Client Events (Backend Emits)

*   **`user-joined`**
    *   **Description:** Broadcasted to all participants in a room when a new user joins.
    *   **Payload:**
        ```json
        {
          "userId": "string",             // The ID of the user who joined
          "userName": "string",           // The username of the user who joined
          "participantCount": "number"    // Current number of participants in the room
        }
        ```

*   **`timer-sync`**
    *   **Description:** Sent to clients to synchronize the current state of the timer.
    *   **Payload:**
        ```json
        {
          "timeRemaining": "number", // Time remaining in milliseconds
          "isRunning": "boolean",    // True if timer is running, false otherwise
          "startedAt": "number"      // Timestamp (ms) when timer started/resumed (if running)
        }
        ```

*   **`timer-started`**
    *   **Description:** Broadcasted when the timer in a room starts.
    *   **Payload:**
        ```json
        {
          "timeRemaining": "number", // Initial duration in milliseconds
          "isRunning": "boolean",    // Should be true
          "startedAt": "number"      // Timestamp (ms) when timer started
        }
        ```

*   **`timer-paused`**
    *   **Description:** Broadcasted when the timer in a room is paused.
    *   **Payload:**
        ```json
        {
          "timeRemaining": "number", // Time remaining at pause
          "isRunning": "boolean"     // Should be false
        }
        ```

*   **`timer-resumed`**
    *   **Description:** Broadcasted when the timer in a room is resumed.
    *   **Payload:**
        ```json
        {
          "timeRemaining": "number", // Time remaining when resumed
          "isRunning": "boolean",    // Should be true
          "startedAt": "number"      // Timestamp (ms) when timer resumed
        }
        ```

*   **`timer-reset`**
    *   **Description:** Broadcasted when the timer in a room is reset.
    *   **Payload:** (No explicit payload, implies timer is reset to initial state/0 and not running)

*   **`chat-message`**
    *   **Description:** Broadcasted to all participants in a room when a new chat message is sent.
    *   **Payload:**
        ```json
        {
          "userId": "string",             // The ID of the message sender
          "userName": "string",           // The username of the message sender
          "message": "string",            // The chat message content
          "timestamp": "ISO_DATE_STRING"  // When the message was sent
        }
        ```

*   **`user-left`**
    *   **Description:** Broadcasted to all participants in a room when a user leaves (or disconnects).
    *   **Payload:**
        ```json
        {
          "userId": "string",             // The ID of the user who left
          "userName": "string",           // The username of the user who left
          "participantCount": "number"    // Current number of participants in the room
        }
        ```
