"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  Send,
  X,
  Sparkles,
  Bot,
  User,
  ShieldAlert,
  TrendingUp,
  DollarSign
} from "lucide-react";

export interface QuantCopilotWidgetProps {
  ticker?: string;
  companyName?: string;
  price?: number;
  onOpenSignalReport?: () => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "copilot";
  text: string;
  timestamp: string;
}

export default function QuantCopilotWidget({
  ticker = "THYAO",
  companyName = "Türk Hava Yolları A.O.",
  price = 314.50,
  onOpenSignalReport
}: QuantCopilotWidgetProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputVal, setInputVal] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "copilot",
      text: `Merhaba! Ben QuantFlux kantitatif fintech copilotuyum. Şu anda terminalde aktif olan ${companyName} (${ticker}) şirketinin bilanço, kâr marjı, event study anormal getirisi ve kur şoku duyarlılığını analiz edebilirim.`,
      timestamp: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const quickPills = [
    `${ticker} son çeyrek kâr marjındaki değişimin sebebi ne?`,
    `Kur şokuna karşı ${ticker} bilanço dayanıklılığı nedir?`,
    `${ticker} Piotroski ve Altman Z temerrüt riski analizi`,
    `${ticker} Event Study bilanço sürprizi ve CAR kaç?`
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputVal).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: text,
      timestamp: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputVal("");
    setIsTyping(true);

    // AI Response Generation
    setTimeout(() => {
      const replyText = generateReply(text);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "copilot",
        text: replyText,
        timestamp: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600);
  };

  const generateReply = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes("marj") || q.includes("kâr marjı") || q.includes("düşüş") || q.includes("kârlılık")) {
      return `${ticker} için son çeyrekte net kâr marjı %18.5, brüt satış kâr marjı %21.4 seviyesindedir. Marjlar üzerindeki temel baskı; satışların maliyetinde (SMM) küresel enflasyon ve jet yakıtı / hammadde girdi artışlarından kaynaklanmaktadır. Ancak güçlü hasılat büyümesi birim maliyet erozyonunu tamponlamıştır.`;
    }

    if (q.includes("kur") || q.includes("kur şoku") || q.includes("döviz") || q.includes("usd") || q.includes("dayanıklılık")) {
      return `${ticker} şirketinin döviz şoku dayanıklılığı "YÜKSEK (A+)" seviyesindedir. Şirketin yabancı para net pozisyonu pozitif aktiftir ve gelirlerinin %70'inden fazlası döviz cinsindendir. Simülasyon motorumuza göre %35 USD/TRY kur şokunda şirket kambiyo zararı yerine +₺15.4 Mrd net kambiyo kârı üretmektedir.`;
    }

    if (q.includes("piotroski") || q.includes("altman") || q.includes("iflas") || q.includes("temerrüt") || q.includes("sağlık")) {
      return `${ticker} bilanço kalite karnesi: Piotroski F-Score 8/9 ("Güçlü Finansal Kalite"). Altman Z''-Score 4.82 ("Güvenli Bölge", Z > 2.6). Şirketin kârlılık, likidite ve operasyonel verimlilik kriterleri mükemmel seviyede olup temerrüt riski ihmal edilebilir düzeydedir.`;
    }

    if (q.includes("sürpriz") || q.includes("event") || q.includes("sue") || q.includes("car") || q.includes("reaksiyon")) {
      return `${ticker} son çeyrek bilançosunda piyasa beklentisinin %15.8 üzerinde gerçekleşme sağladı. Standardized Unexpected Earnings (SUE) skoru +2.18 σ ve [-5, +5] gün kümülatif anormal getirisi (CAR) +%4.80 seviyesindedir. Model Sinyali: "POZİTİF ANORMAL ALFA".`;
    }

    if (q.includes("lstm") || q.includes("tahmin") || q.includes("trend") || q.includes("hedef")) {
      return `PyTorch LSTM derin öğrenme modelimiz 20 günlük vadede ${ticker} için ₺${(price * 1.089).toFixed(2)} (+%8.9) fiyat projeksiyonu üretmektedir. %95 Güven Aralığı [₺${(price * 1.04).toFixed(2)} - ₺${(price * 1.135).toFixed(2)}] bandındadır. Yön: BULLISH ACCELERATION.`;
    }

    if (q.includes("rapor") || q.includes("sinyal") || q.includes("karne")) {
      if (onOpenSignalReport) onOpenSignalReport();
      return `${ticker} için QuantFlux genel sinyali: GÜÇLÜ AL (STRONG BUY) - Skor: 8.8/10. Tüm karne dökümünü Sinyal Raporu modalında inceleyebilir ve PDF olarak yazdırabilirsiniz.`;
    }

    return `${ticker} için güncel terminal göstergeleri: F/K 2.66x, PD/DD 0.69x, Piotroski 8/9, Altman Z 4.82, %99 VaR %4.50. "Kâr marjı", "kur şoku" veya "sinyal raporu" sorabilirsiniz.`;
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-900 border border-emerald-500/40 text-slate-100 shadow-xl shadow-emerald-950/40 hover:border-emerald-400 hover:shadow-emerald-500/20 transition-all duration-300"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <Terminal className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold tracking-wide">Copilot Online</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-96 max-w-[calc(100vw-2rem)] h-[520px] flex flex-col bg-[#090e17] border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-950/40 overflow-hidden text-slate-100 animate-in slide-in-from-bottom-6 duration-300">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-slate-100">QuantFlux Copilot</h4>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <p className="text-[10px] text-emerald-400 font-medium">
                  {ticker} Analitik Bağlamı Aktif
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Action Pills */}
          <div className="p-2.5 border-b border-slate-800/80 bg-slate-950/40 flex flex-wrap gap-1.5 overflow-x-auto">
            {quickPills.map((pill, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(pill)}
                className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-emerald-300 transition text-left"
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Chat Stream */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "copilot" && (
                  <div className="w-6 h-6 rounded-md bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] p-2.5 rounded-xl text-[11px] leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-cyan-950/60 text-cyan-100 border border-cyan-700/40 rounded-br-none"
                      : "bg-slate-900/80 text-slate-200 border border-slate-800 rounded-bl-none"
                  }`}
                >
                  <p>{msg.text}</p>
                  <span className="text-[9px] text-slate-500 block text-right mt-1 font-mono">
                    {msg.timestamp}
                  </span>
                </div>
                {msg.sender === "user" && (
                  <div className="w-6 h-6 rounded-md bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 items-center text-slate-400 text-[11px]">
                <div className="w-6 h-6 rounded-md bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="flex gap-1 p-2 bg-slate-900/80 border border-slate-800 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-2.5 border-t border-slate-800 bg-slate-900/50 flex gap-2">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Kantitatif bir soru sorun..."
              className="flex-1 bg-slate-950/60 border border-slate-700/80 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-400 font-sans"
            />
            <button
              onClick={() => handleSend()}
              className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
