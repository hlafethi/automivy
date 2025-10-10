import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  method: string;
  path: string;
  body?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    let N8N_URL = Deno.env.get("N8N_URL");
    const N8N_API_KEY = Deno.env.get("N8N_API_KEY");

    if (!N8N_URL || !N8N_API_KEY) {
      throw new Error("N8N_URL or N8N_API_KEY not configured");
    }

    if (!N8N_URL.startsWith("http://") && !N8N_URL.startsWith("https://")) {
      N8N_URL = `https://${N8N_URL}`;
    }

    const { method, path, body }: RequestBody = await req.json();

    const url = `${N8N_URL}${path}`;
    
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": N8N_API_KEY,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && (method === "POST" || method === "PATCH" || method === "PUT")) {
      options.body = JSON.stringify(body);
      console.log('Sending to n8n:', {
        url,
        method,
        bodyKeys: Object.keys(body),
        body: JSON.stringify(body, null, 2)
      });
    }

    const response = await fetch(url, options);
    const responseData = response.status === 204 ? null : await response.text();

    if (!response.ok) {
      console.error('n8n error response:', {
        status: response.status,
        data: responseData
      });
    }

    let jsonData = null;
    if (responseData) {
      try {
        jsonData = JSON.parse(responseData);
      } catch {
        jsonData = { message: responseData };
      }
    }

    return new Response(
      JSON.stringify({
        ok: response.ok,
        status: response.status,
        data: jsonData,
        debug: {
          url,
          method,
          hasApiKey: !!N8N_API_KEY,
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});