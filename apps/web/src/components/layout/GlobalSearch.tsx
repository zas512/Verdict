"use client";
import { SearchInput } from "@/components/ui/SearchInput";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

const SEARCH_PATH = "/search";
const NAVIGATE_DELAY_MS = 450;

interface GlobalSearchProps {
  containerClassName?: string;
}

function SearchField({ containerClassName }: Readonly<GlobalSearchProps>) {
  return (
    <SearchInput
      variant="absolute"
      containerClassName={containerClassName ?? "sm:w-48 md:w-64"}
      placeholder="Search cases, associates, expenses..."
      aria-label="Search cases, associates, expenses"
      readOnly
    />
  );
}

function GlobalSearchInner({ containerClassName }: Readonly<GlobalSearchProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSearchPage = pathname === SEARCH_PATH;
  const urlQuery = isSearchPage ? (searchParams.get("q") ?? "") : "";
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  const [query, setQuery] = useState(urlQuery);

  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const trimmed = value.trim();
      const currentUrlQuery = searchParams.get("q") ?? "";
      if (trimmed === currentUrlQuery) return;
      const target = trimmed
        ? `${SEARCH_PATH}?q=${encodeURIComponent(trimmed)}`
        : SEARCH_PATH;
      if (isSearchPage) router.replace(target);
      else router.push(target);
    }, NAVIGATE_DELAY_MS);
  };

  return (
    <SearchInput
      variant="absolute"
      containerClassName={containerClassName ?? "sm:w-48 md:w-64"}
      value={query}
      onChange={handleChange}
      placeholder="Search cases, associates, expenses..."
      aria-label="Search cases, associates, expenses"
      autoComplete="off"
      spellCheck={false}
    />
  );
}

export function GlobalSearch({ containerClassName }: Readonly<GlobalSearchProps>) {
  return (
    <Suspense fallback={<SearchField containerClassName={containerClassName} />}>
      <GlobalSearchInner containerClassName={containerClassName} />
    </Suspense>
  );
}
