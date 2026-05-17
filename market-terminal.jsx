import { useState, useEffect, useRef, useCallback } from "react";

const MARKETS = [
  { id: "nifty", label: "NIFTY 50", derivative: "options" },
  { id: "sensex", label: "SENSEX", derivative: "options" },
  { id: "xauusd", label: "XAU/USD", derivative: "futures" },
  { id: "ethusd", label: "ETH/USD", derivative: "futures" },
];

// Mock data for testing
const MOCK_DATA = {
  nifty: { price: 23450.50, change: 2.5, signal: "BUY", sentiment: "BULLISH" },
  sensex: { price: 77250.30, change: 2.3, signal: "BUY", sentiment: "BULLISH" },
  xauusd: { price: 2385.60, change: -0.8, signal: "HOLD", sentiment: "NEUTRAL" },
  ethusd: { price: 3850.45, change: 5.2, signal: "BUY", sentiment: "BULLISH" },
  alertLevel: "HIGH",
  news: [
    "RBI holds rates steady at 6.5% amid inflation concerns",
    "Fed minutes signal potential rate cuts in Q3 2026",
    "Oil prices surge on OPEC production cuts",
    "Tech stocks rally on AI investment surge"
  ]
};

// Fetch from Claude API with error handling
async function fetchAnalysis() {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.warn("API key not configured, using mock data");
    return MOCK_DATA;
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: "Provide current market data for NIFTY 50, SENSEX, XAU/USD, ETH/USD in JSON format with price, change%, signal (BUY/SELL/HOLD), sentiment"
        }]
      })
    });

    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    const data = await res.json();
    const text = data.content[0].text;
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
    return json;
  } catch (err) {
    console.error("Fetch failed:", err.message);
    return MOCK_DATA;
  }
}

// Price Card Component
function PriceCard({ market, data }) {
  if (!data) return null;
  
  const marketData = data[market.id] || {};
  const changeColor = marketData.change >= 0 ? "#00ff41" : "#ff4444";
  const signalColor = 
    marketData.signal === "BUY" ? "#00ff41" : 
    marketData.signal === "SELL" ? "#ff4444" : "#ffaa00";

  return (
    <div style={{
      background: "#0f1419",
      border: "1px solid #1a3a52",
      padding: "12px",
      borderRadius: "6px",
      marginBottom: "10px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ fontWeight: "bold" }}>{market.label}</span>
        <span style={{ color: changeColor }}>
          {marketData.change >= 0 ? "+" : ""}{marketData.change?.toFixed(2)}%
        </span>
      </div>
      <div style={{ fontSize: "14px", color: "#888", marginBottom: "8px" }}>
        ₹ {marketData.price?.toFixed(2)} | {market.derivative}
      </div>
      <div style={{ color: signalColor, fontWeight: "bold", fontSize: "12px" }}>
        Signal: {marketData.signal} ({marketData.sentiment})
      </div>
    </div>
  );
}

// Signal Card Component
function SignalCard({ data }) {
  if (!data) return null;

  const alertColor = 
    data.alertLevel === "HIGH" ? "#ff4444" :
    data.alertLevel === "MEDIUM" ? "#ffaa00" : "#00ff41";

  return (
    <div style={{
      background: "#0f1419",
      border: `2px solid ${alertColor}`,
      padding: "15px",
      borderRadius: "6px",
      marginBottom: "15px"
    }}>
      <div style={{ marginBottom: "10px" }}>
        <span style={{ color: "#888" }}>Alert Level:</span>
        <span style={{ color: alertColor, fontWeight: "bold", marginLeft: "10px" }}>
          {data.alertLevel}
        </span>
      </div>
      <div style={{ fontSize: "12px", lineHeight: "1.6" }}>
        {data.news?.slice(0, 3).map((item, i) => (
          <div key={i} style={{ marginBottom: "8px", color: "#a8ccdf" }}>
            • {item}
          </div>
        ))}
      </div>
    </div>
  );
}

// Terminal Log Component
function TerminalLog({ logs }) {
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div style={{
      background: "#0a0e15",
      border: "1px solid #1a3a52",
      borderRadius: "6px",
      padding: "12px",
      height: "200px",
      overflowY: "auto",
      fontSize: "11px",
      fontFamily: "monospace",
      lineHeight: "1.5"
    }} ref={logRef}>
      {logs.map((log, i) => (
        <div key={i} style={{ color: "#66bb6a", marginBottom: "4px" }}>
          {log}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState(["Terminal ready.", "Starting market analysis..."]);
  const timer = useRef(null);

  const lg = (msg) => {
    setLog(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p.slice(0, 59)]);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    lg("⟳ Fetching market data...");
    try {
      const d = await fetchAnalysis();
      setData(d);
      lg(`✓ Data updated | Alert: ${d.alertLevel}`);
    } catch (e) {
      lg(`✗ Error: ${e.message}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Register Service Worker for PWA
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("./sw.js")
          .then(() => lg("✓ PWA Registered"))
          .catch(err => lg(`✗ PWA Failed: ${err.message}`));
      });
    }

    // Initial fetch
    refresh();

    // Auto-refresh every 5 minutes
    timer.current = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(timer.current);
  }, [refresh]);

  return (
    <div style={{
      height: "100vh",
      background: "#060d18",
      color: "#b8ccdf",
      fontFamily: "monospace",
      padding: "20px",
      overflowY: "auto"
    }}>
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "24px", marginBottom: "5px" }}>⚡ MarketOS Terminal</h1>
        <p style={{ color: "#666", fontSize: "12px" }}>Real-time quantitative trading analysis</p>
      </div>

      {/* Controls */}
      <button
        onClick={refresh}
        disabled={loading}
        style={{
          background: loading ? "#333" : "#00ff41",
          color: loading ? "#888" : "#000",
          border: "none",
          padding: "10px 20px",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: "bold",
          marginBottom: "20px"
        }}
      >
        {loading ? "Updating..." : "Refresh Data"}
      </button>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Left Column - Markets */}
        <div>
          <h2 style={{ fontSize: "16px", marginBottom: "10px", color: "#00ff41" }}>Market Prices</h2>
          {MARKETS.map(market => (
            <PriceCard key={market.id} market={market} data={data} />
          ))}
        </div>

        {/* Right Column - Signals & Logs */}
        <div>
          <h2 style={{ fontSize: "16px", marginBottom: "10px", color: "#00ff41" }}>Trading Signals</h2>
          <SignalCard data={data} />
          
          <h2 style={{ fontSize: "16px", marginBottom: "10px", color: "#00ff41" }}>Terminal Log</h2>
          <TerminalLog logs={log} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: "20px", fontSize: "12px", color: "#666", textAlign: "center" }}>
        Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
}
