export default function SiteFooter() {
  return (
    <footer className="border-t border-line px-5 py-7 text-center sm:px-8">
      <p className="text-sm text-muted">
        Created by{" "}
        <a
          href="https://iamtanishqsaria.vercel.app/"
          target="_blank"
          rel="noreferrer"
          className="text-ink-soft underline-offset-4 transition hover:text-accent hover:underline"
        >
          Tanishq Saria
        </a>
        <span className="px-2 text-line-strong">·</span>
        <a
          href="mailto:iamtanishqsaria@gmail.com"
          className="text-ink-soft underline-offset-4 transition hover:text-accent hover:underline"
        >
          iamtanishqsaria@gmail.com
        </a>
      </p>
      <p className="mt-1.5 font-serif text-sm italic text-muted">
        yap<span className="text-spectrum">load</span> — talk your day out.
      </p>
    </footer>
  );
}
