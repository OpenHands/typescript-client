export function HomeHeader() {
  return (
    <header className="flex flex-col items-center gap-8">
      {/* Guide Message */}
      <div className="w-fit flex flex-col md:flex-row items-start md:items-center justify-center gap-1 rounded-xl bg-tertiary leading-5 text-white text-[15px] font-normal m-1 md:h-9 px-4 py-2 md:px-4 md:py-0">
        <span>New to OpenHands?</span>
        <a
          href="https://docs.all-hands.dev/usage/getting-started"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-primary transition-colors"
        >
          Click here for help
        </a>
      </div>

      {/* Title */}
      <div className="h-20 flex items-center">
        <h1 className="text-4xl md:text-5xl font-bold text-content-2 tracking-tight">
          Let's start building
        </h1>
      </div>
    </header>
  );
}
