# PWA Storefront Backend Server

This is a Node.js Express server to handle Web Push notifications for the PWA Flash Sale Storefront, with subscriptions persisted in MongoDB.

## Features

-   Saves push notification subscriptions to a MongoDB database.
-   Deletes expired or unsubscribed subscriptions.
-   Provides an endpoint to send notifications to all subscribed users.

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v14 or later recommended)
-   [npm](https://www.npmjs.com/) (usually comes with Node.js)
-   A MongoDB database and its connection string (e.g., from MongoDB Atlas).

### Installation

1.  Navigate to this `server` directory in your terminal:
    ```sh
    cd server
    ```

2.  Install the required dependencies:
    ```sh
    npm install
    ```

### Configuration

1.  This server requires VAPID keys to send push notifications. If you don't have them, generate a new pair by running this command in your terminal:
    ```sh
    npx web-push generate-vapid-keys
    ```
    Keep the generated public and private keys handy.

2.  Create a `.env` file in the `server` directory. An example file is provided:
    ```sh
    cp .env.example .env
    ```
3.  Open the `.env` file and add your MongoDB connection string and the VAPID keys you just generated.
    ```dotenv
    MONGO_URI=mongodb+srv://<user>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority

    VAPID_PUBLIC_KEY="<Your Public VAPID Key>"
    VAPID_PRIVATE_KEY="<Your Private VAPID Key>"
    ```
4.  Make sure the `VAPID_PUBLIC_KEY` in your `.env` file **exactly matches** the one you put in the frontend code (`src/hooks/usePushManager.ts`).

### Running the Server

1.  Once configured, start the server with:
    ```sh
    npm start
    ```

2.  The server will now be running on `http://localhost:4000`. Keep this terminal window open while you are using the PWA frontend.

## API Endpoints

-   `POST /api/save-subscription`: Saves or updates a `PushSubscription` object in the database.
-   `POST /api/delete-subscription`: Deletes a subscription based on its unique `endpoint`.
-   `POST /api/send-flash-sale`: Triggers a predefined "flash sale" notification to all currently stored subscriptions. You can use a tool like Postman or `curl` to test this endpoint.