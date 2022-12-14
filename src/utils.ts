import { URL } from "url";

export const tokeniseStringWithQuotesBySpaces = (string: string): string[] =>
  string.match(/("[^"]*?"|[^"\s]+)+(?=\s*|\s*$)/g) ?? [];

export const faviconUrl = (size: number, url: string): string => {
  const domain = new URL(url).hostname;
  return `https://www.google.com/s2/favicons?sz=${size}&domain=${domain}`;
};
  