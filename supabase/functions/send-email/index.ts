import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { to, subject, text, html } = await req.json();

    if (!to || !subject || !text) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing to / subject / text" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": Deno.env.get("BREVO_API_KEY") || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "FormPilot",
          email: Deno.env.get("SENDER_EMAIL") || "",
        },
        to: [{ email: to }],
        subject,
        textContent: text,
        ...(html ? { htmlContent: html } : {}),
      }),
    });

    const data = await res.json();

    return new Response(
      JSON.stringify(res.ok ? { ok: true, id: data.id } : { ok: false, error: data }),
      {
        status: res.ok ? 200 : 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
