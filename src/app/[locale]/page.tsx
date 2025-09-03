import Image from "next/image";
import ComponentSearch from "@/components/ComponentSearch";
// import { initTranslations } from "@/app/i18n";

interface TranslationsProviderProps {
  params: Promise< {
    locale: string;
  }>;
}

export default async function Home(props: TranslationsProviderProps) {  
  const { locale } = await props.params;
  console.log(locale);
  /*
  const { t } = await initTranslations({
    locale,
    namespaces: ["common"],
  });
   */

  return (
    <div className="items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-screen-xl mx-auto mb-8">
        <ComponentSearch />
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          SBI AntWorks Asia
        </a>
      </footer>
    </div>
  );
}
