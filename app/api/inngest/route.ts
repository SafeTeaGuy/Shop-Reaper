import { serve } from "inngest/next";
import { inngest, pollAllShops, syncShop } from "@/lib/inngest/jobs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [pollAllShops, syncShop],
});
