/**
 * Convenience re-export so code can import from "@/lib/supabase" directly.
 *
 * Client components:  import { createClient } from "@/lib/supabase"
 * Server components / Route Handlers need the async server client:
 *   import { createClient } from "@/lib/supabase/server"
 */
export { createClient } from "./supabase/client";
