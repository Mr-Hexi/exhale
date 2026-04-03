export default function TypingIndicator() {
  return (
    <div className="wa-msg-row recv">
      <div className="wa-msg-av" aria-hidden="true">E</div>
      <div className="wa-bubble recv" style={{ padding: "10px 14px" }}>
        <div className="flex items-center gap-1.5">
          <span
            className="block w-2 h-2 rounded-full"
            style={{ background: "#1D9E75", animation: "waBounce 1.2s infinite", animationDelay: "0s" }}
          />
          <span
            className="block w-2 h-2 rounded-full"
            style={{ background: "#1D9E75", animation: "waBounce 1.2s infinite", animationDelay: "0.2s" }}
          />
          <span
            className="block w-2 h-2 rounded-full"
            style={{ background: "#1D9E75", animation: "waBounce 1.2s infinite", animationDelay: "0.4s" }}
          />
        </div>
      </div>
    </div>
  );
}