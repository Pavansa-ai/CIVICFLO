export const metadata = {
  title: "CivicFlo Admin",
  description: "Worker Portal & Issue Management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.tailwind = window.tailwind || {};
              window.tailwind.config = { darkMode: 'class' };
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme');
                  var preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var useDark = stored ? stored === 'dark' : preferDark;
                  var c = document.documentElement.classList;
                  if (useDark) c.add('dark'); else c.remove('dark');
                } catch {}
              })();
            `,
          }}
        />
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
