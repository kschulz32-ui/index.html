// Loads .env.local then .env for scripts run with tsx (Next loads these itself).
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ quiet: true });
