import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FlightWell",
    template: "%s · FlightWell",
  },
  description:
    "FlightWell, the real-time digital twin for aero piston engines on MALE UAVs. Problem statement 26054, team Shubham Shah.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
