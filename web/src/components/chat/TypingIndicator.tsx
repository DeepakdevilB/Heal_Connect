'use client';

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2.5">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-2 h-2 rounded-full bg-[#f59e0b] animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}
