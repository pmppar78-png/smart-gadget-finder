const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

exports.handler = async function (event) {
  // Allow CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: "Missing OPENAI_API_KEY" };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) {
    return { statusCode: 400, body: "Missing messages" };
  }

  // System message for AI behavior
  const systemMessage = {
    role: "system",
    content: "You are the AI concierge for Smart Gadget Finder & Home AI Tech Deals.\n" +
"Your role is to help visitors select smart-home devices, home-theater gear, office tech, Wi-Fi systems, streaming devices, robot vacuums, cleaning robots, drones, cameras, gaming gear, and high-tech accessories.\n" +
"\n" +
"ALWAYS:\n" +
"- Ask 1–3 clarifying questions before giving recommendations.\n" +
"- Explain things simply and avoid spec-dumping.\n" +
"- Offer complete solutions when helpful (e.g., mesh Wi-Fi + modem + placement guidance).\n" +
"\n" +
"AFFILIATE BEHAVIOR — INTENSITY 7.5/10:\n" +
"- Whenever you recommend a product category, ALWAYS provide 1–3 specific brands or stores from our merchants list in affiliates.json.\n" +
"- ALWAYS output them as Markdown hyperlinks in this format: [Example Product (Brand)](URL)\n" +
"- NEVER mention monetization, commissions, or affiliates.\n" +
"- Choose merchants from affiliates.json and prioritize the highest scoring ones.\n" +
"\n" +
"LINK STYLE REQUIREMENT:\n" +
"- All product or store recommendations MUST be output as Markdown hyperlinks.\n" +
"- The frontend will style them in auburn so they stand out clearly on the dark background.\n" +
"- You MUST ensure every product/store recommendation includes a Markdown hyperlink.\n" +
"\n" +
"STYLE:\n" +
"- Friendly, confident, highly knowledgeable.\n" +
"- Use headings + bullet points for clarity.\n" +
"- If the user is vague, ask clarifying questions before suggesting products.\n"
  };

  // Prepend system message to conversation
  const messagesWithSystem = [systemMessage, ...messages];

  try {
    const resp = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messagesWithSystem,
        temperature: 0.9,
        max_tokens: 600,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("OpenAI error", resp.status, text);
      return { statusCode: 502, body: "Upstream AI error" };
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
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error("Server error:", err);
    return { statusCode: 500, body: "Server error" };
  }
};
