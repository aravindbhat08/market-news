import { useState, useEffect, useRef, useCallback } from "react";

const MARKETS = [
  { id: "nifty", label: "NIFTY 50", derivative: "options" },
  { id: "sensex", label: "SENSEX", derivative: "options" },
  { id: "xauusd", label: "XAU/USD", derivative: "futures" },
  { id: "ethusd", label: "ETH/USD", derivative: "futures" },
];

const SYSTEM_PROMPT = `You are an elite quantitative trading analyst specializing in Indian equity markets (Nifty 50, Sensex), precious metals (XAU/USD), and cryptocurrency (Ethereum/ETH). Respond ONLY with a single valid JSON object.`;

const USER_PROMPT = `Search the web right now for live prices and macro news...`;

async function fetchAnalysis() {
  // NOTE: Browser-side calls to Anthropic require a proxy or 'dangerouslyAllowBrowser'
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { 
        "Content-Type": "application/json",
        "x-api-key": "YOUR_API_KEY_HERE", 
        "anthropic-version": "2023-06-01",
        "dangerouslyAllowBrowser": "true" 
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: USER_PROMPT }],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("No JSON in response");
  return JSON.parse(m[0]);
}

// ... (Keep all PriceCard, SignalCard, and other sub-components from your original code)

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState(["Terminal ready."]);
  const timer = useRef(null);

  const lg = msg => setLog(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p.slice(0, 59)]);

  const refresh = useCallback(async () => {
    setLoading(true);
    lg("⟳ Scanning global news & fetching live prices...");
    try {
      const d = await fetchAnalysis();
      setData(d);
      lg(`✓ Updated | Alert: ${d.alertLevel?.toUpperCase()}`);
    } catch (e) {
      lg(`✗ ${e.message}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(() => console.log("PWA Registered"))
          .catch(err => console.log("PWA Failed", err));
      });
    }

    timer.current = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(timer.current);
  }, [refresh]);

  return (
    <div style={{ height: "100vh", background: "#060d18", color: "#b8ccdf", fontFamily: "monospace" }}>
      {/* ... (Keep the rest of your original JSX layout here) */}
    </div>
  );
}