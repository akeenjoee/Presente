import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const user = req.nextauth.token;

    // Le rotte pubbliche o aperte a tutti i membri @jemore.it
    if (pathname.startsWith("/checkin") || pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
      return NextResponse.next();
    }

    // Rotte riservate al Board o Responsabili
    const ruolo = (user?.ruolo as string)?.toLowerCase() || "";
    const area_lavoro = (user?.area_lavoro as string)?.toLowerCase() || "";
    const email = (user?.email as string)?.toLowerCase() || "";

    const isBoardOrResponsabile = 
      ruolo.includes("board") || 
      ruolo.includes("responsabile") ||
      ruolo.includes("manager") ||
      ruolo === "co" ||
      ruolo.includes("segretario generale") ||
      area_lavoro.includes("board") ||
      area_lavoro.includes("responsabile") ||
      area_lavoro === "it" ||
      area_lavoro.includes("it ") ||
      email === "board@jemore.it" || 
      email === "responsabili@jemore.it";

    if (!isBoardOrResponsabile) {
      // Restituisce 403 Forbidden o reindirizza a una pagina di errore 403
      return new NextResponse("403 Forbidden - Accesso riservato al Board/Responsabili", { status: 403 });
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        // Allow unauthenticated users to access /checkin and /login so they can see the custom login screen
        if (req.nextUrl.pathname.startsWith("/checkin") || req.nextUrl.pathname.startsWith("/login")) {
          return true;
        }
        return !!token; // Assicura che l'utente sia loggato per le altre rotte
      },
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
