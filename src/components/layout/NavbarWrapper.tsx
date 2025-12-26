"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";

export function NavbarWrapper() {
  const pathname = usePathname();

  // Si la ruta comienza con /contapb, NO mostramos el Navbar
  if (pathname?.startsWith("/contapb")) {
    return null;
  }

  // En cualquier otra ruta, mostramos el Navbar normal
  return <Navbar />;
}