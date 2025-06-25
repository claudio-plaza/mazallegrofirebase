
import { config } from 'dotenv';
config();

// This will register all flows defined in the imported files.
import './flows/suggest-member-updates.ts';
