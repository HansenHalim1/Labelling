import "./globals.css";

import Navbar from "../components/Navbar";
import { SaveAllProvider } from "../components/SaveAllContext";

export const metadata = {
  title: "Abbreviation Corpus",
  description: "Manage abbreviation entries with Supabase",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SaveAllProvider>
          <Navbar />
          <main className="main-content">{children}</main>
        </SaveAllProvider>
      </body>
    </html>
  );
}
