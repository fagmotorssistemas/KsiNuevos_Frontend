export const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-[#0c0c0e] min-h-[calc(58vh-2cm)] h-[min(calc(86vh-2cm),56.25vw)]">
      <video
        src="/hero-reel-720.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="absolute left-1/2 top-1/2 h-full w-full max-w-none -translate-x-1/2 -translate-y-1/2 object-cover object-center"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/40 via-white/15 to-transparent" aria-hidden />
    </section>
  );
};
