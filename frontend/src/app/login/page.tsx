"use client";

import React, { Suspense } from "react";
import { signIn } from "next-auth/react";
import { QrCode, ShieldAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  return (
    <div className="max-w-md w-full mx-auto my-12 p-10 bg-white rounded-xl shadow-2xl text-center">
      <div className="flex justify-center mb-5">
         <div className="p-3 border border-[#2b397c] rounded-full">
           <QrCode className="h-8 w-8 text-[#2b397c]" />
         </div>
      </div>
      
      <h2 className="text-2xl font-bold text-[#1f295c] mb-1 tracking-tight">
        Presente!
      </h2>
      
      <p className="text-sm text-gray-500 mb-8">
        Accesso Piattaforma
      </p>

      <div className="bg-gray-50 text-gray-700 text-[13px] font-medium py-3 px-4 rounded-lg mb-8 flex items-center justify-center gap-2 border border-gray-100 shadow-sm">
         <ShieldAlert className="h-4 w-4 text-[#1f295c]" />
         Utilizza il tuo account <strong>JEMORE</strong> per accedere.
      </div>

      <button 
        onClick={() => signIn("azure-ad", { callbackUrl })}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-full font-semibold flex items-center justify-center gap-2 transition-colors shadow-md"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
        </svg>
        Accedi con Microsoft
      </button>

      <p className="text-[11px] text-gray-400 mt-10">
        L'accesso è riservato ai soci JEMORE.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center min-h-screen p-6 bg-[#253264]">
      <Suspense fallback={<div className="text-white text-sm">Caricamento...</div>}>
        <LoginContent />
      </Suspense>
    </main>
  );
}
