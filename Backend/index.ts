import { Hono } from "https://esm.sh/hono@3.11.7";
import { readFile, serveFile } from "https://esm.town/v/std/utils/index.ts";
import { runMigrations } from "./database/migrations.ts";
import { getAttendanceStats } from "./database/queries.ts";
import usersRouter from "./routes/users.ts";
import attendanceRouter from "./routes/attendance.ts";

const app = new Hono();

// Unwrap Hono errors to see original error details
app.onError((err, c) => {
  throw err;
});

// Initialize database on startup
await runMigrations();

// API Routes
app.route("/api/users", usersRouter);
app.route("/api/attendance", attendanceRouter);

// Health check endpoint
app.get("/api/health", async (c) => {
  try {
    const stats = await getAttendanceStats();
    return c.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      stats: stats
    });
  } catch (error) {
    return c.json({ 
      status: "unhealthy", 
      error: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Serve static files
app.get("/frontend/*", c => serveFile(c.req.path, import.meta.url));
app.get("/shared/*", c => serveFile(c.req.path, import.meta.url));

// Serve main application
app.get("/", async c => {
  try {
    let html = await readFile("/frontend/index.html", import.meta.url);

    // Inject initial data to avoid extra round-trips
    const initialData = await getAttendanceStats();
    const dataScript = `<script>
      window.__INITIAL_DATA__ = ${JSON.stringify(initialData)};
    </script>`;

    html = html.replace("</head>", `${dataScript}</head>`);
    return c.html(html);
  } catch (error) {
    console.error("Error serving main page:", error);
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Face Recognition Attendance System</title>
          <script src="https://cdn.twind.style" crossorigin></script>
        </head>
        <body class="bg-gray-100 p-8">
          <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <h1 class="text-2xl font-bold text-red-600 mb-4">⚠️ System Error</h1>
            <p class="text-gray-700">Unable to load the application. Please check the system configuration.</p>
            <p class="text-sm text-gray-500 mt-4">Error: ${error.message}</p>
          </div>
        </body>
      </html>
    `, 500);
  }
});

// 404 handler
app.notFound((c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>404 - Page Not Found</title>
        <script src="https://cdn.twind.style" crossorigin></script>
      </head>
      <body class="bg-gray-100 p-8">
        <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
          <h1 class="text-2xl font-bold text-gray-800 mb-4">404 - Page Not Found</h1>
          <p class="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
          <a href="/" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Go Home
          </a>
        </div>
      </body>
    </html>
  `, 404);
});

// This is the entry point for HTTP vals
export default app.fetch;
