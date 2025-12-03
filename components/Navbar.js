"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSaveAllContext } from "./SaveAllContext";

const links = [
  { href: "/not-completed", label: "Not Completed" },
  { href: "/completed", label: "Completed" },
];

export default function Navbar() {
  const pathname = usePathname();
  const activePath = pathname === "/" ? "/not-completed" : pathname;
  const { config } = useSaveAllContext();
  const { onClick, disabled, label } = config;

  return (
    <header className="navbar">
      <div className="nav-inner">
        <div className="nav-title">Abbreviation Corpus</div>
        <div className="nav-actions">
          <nav className="nav-links">
            {links.map((link) => {
              const isActive = activePath.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link ${isActive ? "active" : ""}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <button
            className="btn btn-primary nav-save-btn"
            onClick={onClick || (() => {})}
            disabled={!onClick || disabled}
          >
            {label || "Save all"}
          </button>
        </div>
      </div>
    </header>
  );
}
