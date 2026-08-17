"use client";
import { useState } from "react";
import LAW_QUOTES from "@/lib/quotes.json";

interface LawQuote {
  text: string;
  author: string;
}

const Quotes = () => {
  const [quote] = useState<LawQuote>(() => {
    const randomIndex =
      crypto.getRandomValues(new Uint32Array(1))[0] % LAW_QUOTES.length;
    return LAW_QUOTES[randomIndex];
  });
  return (
    <>
      <p className="text-primary-foreground/90 font-serif text-3xl leading-12 tracking-wide italic">
        &quot;{quote.text}&quot;
      </p>
      <p className="text-primary-foreground/70 font-sans text-sm font-bold tracking-widest uppercase">
        — {quote.author}
      </p>
    </>
  );
};

export default Quotes;
