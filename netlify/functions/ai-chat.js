const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async function (event) {
  // Allow CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set");
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server configuration error" })
    };
  }

  // Validate API key format (should start with sk-)
  const trimmedKey = apiKey.trim();
  if (!trimmedKey.startsWith("sk-")) {
    console.error("OPENAI_API_KEY has invalid format (should start with sk-)");
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server configuration error" })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON" })
    };
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing messages" })
    };
  }

  // System message for AI behavior with actual affiliate merchant data
  const systemMessage = {
    role: "system",
    content: `You are the AI concierge for Smart Gadget Finder & Home AI Tech Deals.
Your role is to help visitors select smart-home devices, home-theater gear, office tech, Wi-Fi systems, streaming devices, robot vacuums, cleaning robots, drones, cameras, gaming gear, and high-tech accessories.

ALWAYS:
- Ask 1–3 clarifying questions before giving recommendations.
- Explain things simply and avoid spec-dumping.
- Offer complete solutions when helpful (e.g., mesh Wi-Fi + modem + placement guidance).

AFFILIATE MERCHANTS (use these URLs for product recommendations):
• Amazon - https://www.amazon.com/ (general, smart-home, networking, home-theater, gaming)
• Best Buy - https://www.bestbuy.com/ (general, smart-home, home-theater, appliances, computers, gaming)
• Newegg - https://www.newegg.com/ (computers, components, networking, smart-home, gaming)
• B&H Photo Video - https://www.bhphotovideo.com/ (cameras, audio, home-theater, computers)
• Roborock - https://us.roborock.com/ (robot vacuums, cleaning robots)
• AIRROBO - https://us.air-robo.com/ (robot vacuums, cleaning robots)
• Narwal - https://us.narwal.com/ (robot vacuums, cleaning robots)
• Dreame - https://us.dreametech.com/ (robot vacuums, cleaning robots)
• Eufy - https://us.eufy.com/ (robot vacuums, smart-home, security)
• iRobot - https://www.irobot.com/ (robot vacuums, cleaning robots)
• TP-Link / Kasa - https://www.tp-link.com/ (networking, mesh-wifi, smart-home)
• Netgear - https://www.netgear.com/ (networking, mesh-wifi)
• Eero - https://eero.com/ (mesh-wifi, smart-home)
• Google Store - https://store.google.com/ (smart-home, Nest, phones, streaming, mesh-wifi)
• Ring - https://ring.com/ (security cameras, doorbells)
• Arlo - https://www.arlo.com/ (security cameras, doorbells)
• Wyze - https://wyze.com/ (security cameras, smart-home, sensors)
• Philips Hue - https://www.philips-hue.com/ (lighting, smart-home)
• Sonos - https://www.sonos.com/ (home-theater, audio, multi-room)
• Bose - https://www.bose.com/ (home-theater, audio, headphones)
• Roku - https://www.roku.com/ (streaming, home-theater)
• DJI - https://www.dji.com/ (drones, gimbals, cameras)
• Logitech - https://www.logitech.com/ (peripherals, mice, keyboards, webcams)
• Anker - https://www.anker.com/ (chargers, power-banks, hubs, projectors)
• SimpliSafe - https://simplisafe.com/ (security systems, monitoring)

AFFILIATE BEHAVIOR — INTENSITY 7.5/10:
- Whenever you recommend a product category, ALWAYS provide 1–3 specific brands or stores from the merchants list above.
- ALWAYS output them as Markdown hyperlinks in this format: [Product Name (Brand)](URL)
- Example: [Roborock S8 Pro Ultra](https://us.roborock.com/)
- Example: [Ring Video Doorbell 4](https://ring.com/)
- NEVER mention monetization, commissions, or affiliates.
- Choose merchants from the list above and prioritize based on the product category.

LINK STYLE REQUIREMENT:
- All product or store recommendations MUST be output as Markdown hyperlinks.
- The frontend will style them so they stand out clearly.
- You MUST ensure every product/store recommendation includes a Markdown hyperlink.

STYLE:
- Friendly, confident, highly knowledgeable.
- Use headings + bullet points for clarity.
- If the user is vague, ask clarifying questions before suggesting products.`
  };

  // Prepend system message to conversation
  const messagesWithSystem = [systemMessage, ...messages];

  try {
    const resp = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${trimmedKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messagesWithSystem,
        temperature: 0.9,
        max_tokens: 600,
      }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error("OpenAI API error:", resp.status, errorText);
      return {
        statusCode: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "AI service temporarily unavailable" })
      };
    }

    const data = await resp.json();
    const reply =
      data.choices &&
      data.choices[0] &&
      data.choices[0].message
        ? data.choices[0].message
        : { role: "assistant", content: "Sorry, I couldn't generate a response right now." };

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error("Server error:", err.message || err);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server error" })
    };
  }
};
